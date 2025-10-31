import { ENV } from "../lib/env.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

const buildSystemPrompt = () =>
  "You are Luna, a friendly, knowledgeable chat companion. Be concise, warm, and helpful. If asked for current time/date, answer precisely. When unsure, ask a clarifying question. Avoid unsafe or private data. Use bullet lists for steps or options when helpful.";

export const chatWithBot = async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ message: "Message is required" });
    }

    const provider = (ENV.LUNA_PROVIDER || "gemini").toLowerCase();
    const openAiKey = process.env.OPENAI_API_KEY || ENV.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY || ENV.GEMINI_API_KEY;
    const model = provider === "openai" ? (ENV.OPENAI_MODEL || "gpt-4o-mini") : provider === "gemini" ? (ENV.GEMINI_MODEL || "gemini-1.5-pro") : (ENV.OLLAMA_MODEL || "llama3.2:latest");
    const temperature = ENV.OPENAI_TEMPERATURE ? Number(ENV.OPENAI_TEMPERATURE) : 0.7;
    const baseUrl = (
      provider === "openai"
        ? (ENV.OPENAI_BASE_URL || "https://api.openai.com/v1")
        : provider === "gemini"
          ? (ENV.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta")
          : (ENV.OLLAMA_BASE_URL || "http://localhost:11434")
    ).replace(/\/$/, "");
    const timeoutMs = ENV.OPENAI_TIMEOUT_MS ? Number(ENV.OPENAI_TIMEOUT_MS) : 20000;

    let replyText;
    try {
      // Lazy import to avoid dependency if not configured
      const fetchImpl = globalThis.fetch ?? (await import("node-fetch")).default;
      const messages = [
        { role: "system", content: buildSystemPrompt() },
        // optional short memory window from client
        ...(Array.isArray(history) ? history.slice(-12) : []),
        { role: "user", content: message },
      ];
      
      if (provider === "openai") {
        if (!openAiKey) {
          return res.status(501).json({ message: "OPENAI_API_KEY missing", mode: "openai-disabled" });
        }
        const url = `${baseUrl}/chat/completions`;
        async function callOnce(signal) {
          return fetchImpl(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${openAiKey}`,
            },
            body: JSON.stringify({ model, messages, temperature, max_tokens: 512 }),
            signal,
          });
        }
        async function callWithRetries(retries = 2) {
          for (let attempt = 0; attempt <= retries; attempt++) {
            const ac = typeof AbortController !== "undefined" ? new AbortController() : null;
            const timer = ac ? setTimeout(() => ac.abort(), timeoutMs) : null;
            try {
              const resp = await callOnce(ac?.signal);
              if (timer) clearTimeout(timer);
              return resp;
            } catch (err) {
              if (timer) clearTimeout(timer);
              if (attempt === retries) throw err;
              await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
            }
          }
        }
        const response = await callWithRetries(2);
        if (!response.ok) {
          const errBody = await response.text();
          return res.status(502).json({ message: "OpenAI API error", details: errBody });
        }
        const data = await response.json();
        replyText = cleanReply(data?.choices?.[0]?.message?.content?.trim() || "");
        if (!replyText) return res.status(502).json({ message: "Empty response from model" });
        // persist and emit
        const luna = await User.findOne({ email: "luna@chatify.ai" });
        const userId = req.user._id;
        await Message.create({ senderId: userId, receiverId: luna._id, text: message });
        const saved = await Message.create({ senderId: luna._id, receiverId: userId, text: replyText });
        const receiverSocketId = getReceiverSocketId(userId.toString());
        if (receiverSocketId) io.to(receiverSocketId).emit("newMessage", saved);
        return res.status(200).json({ reply: replyText, mode: "openai" });
      }

      if (provider === "gemini") {
        if (!geminiKey) {
          return res.status(501).json({ message: "GEMINI_API_KEY missing", mode: "gemini-disabled" });
        }
        // Map history into Gemini contents
        const toGeminiRole = (r) => (r === "assistant" ? "model" : "user");
        const contents = [];
        for (const m of messages) {
          const role = m.role === "system" ? "user" : toGeminiRole(m.role);
          contents.push({ role, parts: [{ text: m.content }] });
        }
        const url = `${baseUrl}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(geminiKey)}`;
        const response = await fetchImpl(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: buildSystemPrompt() }] },
            contents,
            generationConfig: { temperature, maxOutputTokens: 512 },
          }),
        });
        if (!response.ok) {
          const errText = await response.text();
          return res.status(502).json({ message: "Gemini API error", details: errText });
        }
        const data = await response.json();
        replyText = cleanReply(data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "");
        if (!replyText) return res.status(502).json({ message: "Empty response from model" });
        const luna = await User.findOne({ email: "luna@chatify.ai" });
        const userId = req.user._id;
        await Message.create({ senderId: userId, receiverId: luna._id, text: message });
        const saved = await Message.create({ senderId: luna._id, receiverId: userId, text: replyText });
        const receiverSocketId = getReceiverSocketId(userId.toString());
        if (receiverSocketId) io.to(receiverSocketId).emit("newMessage", saved);
        return res.status(200).json({ reply: replyText, mode: "gemini" });
      }

      // OLLAMA provider (free, local)
      const url = `${baseUrl}/api/chat`;
      const response = await fetchImpl(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages,
          options: { temperature },
          stream: false,
        }),
      });
      if (!response.ok) {
        const errText = await response.text();
        return res.status(502).json({ message: "Ollama API error", details: errText });
      }
      const data = await response.json();
      replyText = cleanReply(data?.message?.content?.trim() || "");
      if (!replyText) return res.status(502).json({ message: "Empty response from model" });
      const luna = await User.findOne({ email: "luna@chatify.ai" });
      const userId = req.user._id;
      await Message.create({ senderId: userId, receiverId: luna._id, text: message });
      const saved = await Message.create({ senderId: luna._id, receiverId: userId, text: replyText });
      const receiverSocketId = getReceiverSocketId(userId.toString());
      if (receiverSocketId) io.to(receiverSocketId).emit("newMessage", saved);
      return res.status(200).json({ reply: replyText, mode: "ollama" });
    } catch (e) {
      console.error("Luna provider call failed:", e);
      return res.status(502).json({ message: "Failed to call provider", error: String(e) });
    }
  } catch (error) {
    console.error("Error in chatWithBot:", error);
    return res.status(500).json({ message: "Failed to get response from Luna" });
  }
};

// Clean up common boilerplate (Gemini etc)
const cleanReply = (text) => {
  if (!text) return text;
  const unwanted = [
    /^If you want the text in bold[^.]+\.?/i,
    /^I can do many things to help you[^.]*\.?/i,
    /^I'm here to help[^.]*\.?/i,
    /^Here are some things I can do[^.]*\.?/i,
  ];
  let out = text.trim();
  for (const pat of unwanted) {
    out = out.replace(pat, '').trim();
  }
  // Remove repeated whitespace at start
  return out.replace(/^\s+/, '');
};


