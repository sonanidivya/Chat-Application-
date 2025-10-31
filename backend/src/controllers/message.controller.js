import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import Message from "../models/Message.js";
import User from "../models/User.js";

export const getAllContacts = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.log("Error in getAllContacts:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getMessagesByUserId = async (req, res) => {
  try {
    const myId = req.user._id;
    const { id: userToChatId } = req.params;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    });

    const filtered = messages.filter((m) => !m.deletedFor?.some((u) => u.toString() === myId.toString()));

    res.status(200).json(filtered);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    if (!text && !image) {
      return res.status(400).json({ message: "Text or image is required." });
    }
    if (senderId.equals(receiverId)) {
      return res.status(400).json({ message: "Cannot send messages to yourself." });
    }
    const receiverExists = await User.exists({ _id: receiverId });
    if (!receiverExists) {
      return res.status(404).json({ message: "Receiver not found." });
    }

    let imageUrl;
    if (image) {
      // upload base64 image to cloudinary
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
    });

    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const userId = req.user._id;
    const { messageId } = req.params;
    const { mode } = req.body; // 'me' | 'everyone'

    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ message: "Message not found" });

    if (mode === "me") {
      if (!msg.deletedFor) msg.deletedFor = [];
      if (!msg.deletedFor.some((u) => u.toString() === userId.toString())) msg.deletedFor.push(userId);
      await msg.save();
      return res.status(200).json({ id: messageId, mode: "me" });
    }

    if (mode === "everyone") {
      if (msg.senderId.toString() !== userId.toString()) return res.status(403).json({ message: "Only sender can delete for everyone" });
      msg.isDeleted = true;
      msg.text = null;
      msg.image = null;
      await msg.save();

      const receiverSocketId = getReceiverSocketId(msg.receiverId.toString());
      if (receiverSocketId) io.to(receiverSocketId).emit("messageDeleted", { id: msg._id });
      return res.status(200).json({ id: messageId, mode: "everyone" });
    }

    return res.status(400).json({ message: "Invalid mode" });
  } catch (error) {
    console.error("Error in deleteMessage:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getChatPartners = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    // find all the messages where the logged-in user is either sender or receiver
    const messages = await Message.find({
      $or: [{ senderId: loggedInUserId }, { receiverId: loggedInUserId }],
    });

    const chatPartnerIds = [
      ...new Set(
        messages.map((msg) =>
          msg.senderId.toString() === loggedInUserId.toString()
            ? msg.receiverId.toString()
            : msg.senderId.toString()
        )
      ),
    ];

    const chatPartners = await User.find({ _id: { $in: chatPartnerIds } }).select("-password");

    res.status(200).json(chatPartners);
  } catch (error) {
    console.error("Error in getChatPartners: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const reactToMessage = async (req, res) => {
  try {
    const userId = req.user._id;
    const { messageId } = req.params;
    const { emoji } = req.body;
    if (!emoji) return res.status(400).json({ message: "Emoji required" });
    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ message: "Message not found" });
    if (!msg.reactions) msg.reactions = {};
    let arr = (msg.reactions?.get ? msg.reactions.get(emoji) : msg.reactions[emoji]) || [];
    const already = arr.some((r) => r.userId.toString() === userId.toString());
    if (already) {
      arr = arr.filter((r) => r.userId.toString() !== userId.toString());
    } else {
      arr = [...arr, { userId, emoji }];
    }
    if (msg.reactions?.set) {
      msg.reactions.set(emoji, arr);
    } else {
      msg.reactions[emoji] = arr;
    }
    msg.markModified && msg.markModified("reactions");
    await msg.save();

    const reactionsPayload = msg.reactions?.toJSON ? msg.reactions.toJSON() : msg.reactions;

    // notify both sender and receiver by socket
    const senderSocketId = getReceiverSocketId(msg.senderId.toString());
    const receiverSocketId = getReceiverSocketId(msg.receiverId.toString());
    const payload = { id: msg._id, reactions: reactionsPayload };
    if (senderSocketId) io.to(senderSocketId).emit("messageReacted", payload);
    if (receiverSocketId && receiverSocketId !== senderSocketId) io.to(receiverSocketId).emit("messageReacted", payload);
    res.status(200).json(payload);
  } catch (e) {
    console.error("reactToMessage error:", e);
    res.status(500).json({ message: "Internal server error" });
  }
};
