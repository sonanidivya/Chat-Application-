import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import ChatHeader from "./ChatHeader";
import NoChatHistoryPlaceholder from "./NoChatHistoryPlaceholder";
import MessageInput from "./MessageInput";
import MessagesLoadingSkeleton from "./MessagesLoadingSkeleton";
import MessageContextMenu from "./MessageContextMenu";
import { axiosInstance } from "../lib/axios";
// Bold-only renderer for Luna: converts **bold** or __bold__ to <strong>bold</strong>
const renderLunaTextAsHtml = (text) => {
  if (!text) return "";
  // Escape HTML to avoid injection
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  // Convert Markdown bold to <strong>
  const withBold = escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>");
  return withBold;
};

function ChatContainer() {
  const {
    selectedUser,
    getMessagesByUserId,
    messages,
    isMessagesLoading,
    subscribeToMessages,
    unsubscribeFromMessages,
    isPartnerTyping,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const [menu, setMenu] = useState({ open: false, x: 0, y: 0, message: null });

  useEffect(() => {
    getMessagesByUserId(selectedUser._id);
    subscribeToMessages();

    // clean up
    return () => unsubscribeFromMessages();
  }, [selectedUser, getMessagesByUserId, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <>
      <ChatHeader />
      <div className="flex-1 min-h-0 px-6 overflow-y-auto py-6">
        {messages.length > 0 && !isMessagesLoading ? (
          <div className="max-w-3xl mx-auto space-y-2">
            {messages.map((msg) => (
              <div
                key={msg._id}
                className={`chat ${msg.senderId === authUser._id ? "chat-end" : "chat-start"}`}
                onContextMenu={(e) => { e.preventDefault(); setMenu({ open: true, x: e.clientX, y: e.clientY, message: msg }); }}
              >
                <div
                  className={`chat-bubble relative max-w-[80%] break-words whitespace-pre-wrap leading-relaxed ${
                    msg.senderId === authUser._id
                      ? "bg-cyan-600 text-white"
                      : "bg-slate-800 text-slate-200"
                  }`}
                  onContextMenu={(e) => { e.preventDefault(); setMenu({ open: true, x: e.clientX, y: e.clientY, message: msg }); }}
                >
                  {msg.isDeleted ? (
                    <p className="text-xs opacity-70 italic">This message was deleted</p>
                  ) : (<>
                  {msg.image && (
                    <img src={msg.image} alt="Shared" className="rounded-lg h-48 object-cover" />
                  )}
                  {msg.text && (
                    msg.senderId !== authUser._id && selectedUser.email === "luna@chatify.ai" ? (
                      <p className="mt-2" dangerouslySetInnerHTML={{ __html: renderLunaTextAsHtml(msg.text) }} />
                    ) : (
                      <p className="mt-2">{msg.text}</p>
                    )
                  )}
                  </>)}
                  <p className="text-[10px] mt-1 opacity-75 flex items-center gap-1">
                    {new Date(msg.createdAt).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {Object.entries(msg.reactions)
                        .map(([e, list]) => [e, Array.isArray(list) ? list : []])
                        .filter(([, arr]) => arr.length > 0)
                        .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
                        .map(([e, arr]) => {
                          const iReacted = arr.some(r => String(r.userId) === String(authUser._id));
                          const names = arr
                            .map(r => String(r.userId) === String(authUser._id) ? "You" : (String(selectedUser._id) === String(r.userId) ? selectedUser.fullName : ""))
                            .filter(Boolean)
                            .join(", ");
                          return (
                            <span
                              key={e}
                              title={names}
                              className={`px-2 py-0.5 text-xs rounded-full border ${iReacted ? "bg-cyan-600/20 border-cyan-500/40" : "bg-black/20 border-white/10"}`}
                            >
                              {e} {arr.length}
                            </span>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {/* 👇 scroll target */}
            <div ref={messageEndRef} />
            {isPartnerTyping && selectedUser.email === "luna@chatify.ai" && (
              <div className="chat chat-start">
                <div className="chat-bubble bg-slate-800 text-slate-200">
                  <span className="inline-flex gap-1 items-center">
                    <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse"></span>
                    <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse [animation-delay:150ms]"></span>
                    <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse [animation-delay:300ms]"></span>
                  </span>
                </div>
              </div>
            )}
            {isPartnerTyping && selectedUser.email !== "luna@chatify.ai" && (
              <div className="chat chat-start">
                <div className="chat-bubble bg-slate-800 text-slate-200">
                  <span className="inline-flex gap-1 items-center">
                    <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse"></span>
                    <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse [animation-delay:150ms]"></span>
                    <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse [animation-delay:300ms]"></span>
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : isMessagesLoading ? (
          <MessagesLoadingSkeleton />
        ) : (
          <NoChatHistoryPlaceholder name={selectedUser.fullName} />
        )}
        <MessageContextMenu
          open={menu.open}
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu({ open: false, x: 0, y: 0, message: null })}
          onEmojiClick={async (emoji) => {
            const m = menu.message; if (!m) return; setMenu({ open: false, x: 0, y: 0, message: null });
            try {
              await axiosInstance.patch(`/messages/${m._id}/react`, { emoji });
            } catch (e) {
              const msg = e.response?.data?.message || e.message || "Failed to react to message";
              window?.toast ? window.toast.error(msg) : alert(msg);
              return;
            }
            const current = useChatStore.getState().messages;
            const updated = current.map((x) => {
              if (x._id !== m._id) return x;
              const reactions = { ...(x.reactions || {}) };
              const list = Array.isArray(reactions[emoji]) ? [...reactions[emoji]] : [];
              const idx = list.findIndex(r => String(r.userId) === String(authUser._id));
              if (idx >= 0) list.splice(idx, 1); else list.push({ userId: authUser._id, emoji });
              reactions[emoji] = list;
              return { ...x, reactions };
            });
            useChatStore.setState({ messages: updated });
          }}
          items={[
            {
              label: "Delete for me",
              onClick: async () => {
                const m = menu.message; if (!m) return; setMenu({ open: false, x: 0, y: 0, message: null });
                await axiosInstance.post(`/messages/delete/${m._id}`, { mode: "me" });
                const current = useChatStore.getState().messages;
                useChatStore.setState({ messages: current.filter((x) => x._id !== m._id) });
              },
            },
            ...((menu.message && menu.message.senderId === authUser._id && !menu.message.isDeleted)
              ? [{ label: "Delete for everyone", danger: true, onClick: async () => {
                    const m = menu.message; if (!m) return; setMenu({ open: false, x: 0, y: 0, message: null });
                    await axiosInstance.post(`/messages/delete/${m._id}`, { mode: "everyone" });
                    const current = useChatStore.getState().messages;
                    useChatStore.setState({ messages: current.map((x) => (x._id === m._id ? { ...x, isDeleted: true, text: null, image: null } : x)) });
                  }}]
              : [])
          ]}
        />
      </div>

      <MessageInput />
    </>
  );
}

export default ChatContainer;
