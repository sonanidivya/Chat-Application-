import Group from "../models/Group.js";
import GroupMessage from "../models/GroupMessage.js";
import User from "../models/User.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

async function hydrateMessagesWithSender(messages) {
  const ids = Array.from(new Set(messages.map((m) => m.senderId.toString())));
  const users = await User.find({ _id: { $in: ids } }, "_id fullName profilePic");
  const map = new Map(users.map((u) => [u._id.toString(), u]));
  return messages.map((m) => ({
    ...m.toObject(),
    senderName: map.get(m.senderId.toString())?.fullName || "",
    senderProfilePic: map.get(m.senderId.toString())?.profilePic || "",
  }));
}

export const createGroup = async (req, res) => {
  try {
    const { name, memberIds = [], avatar } = req.body;
    if (!name) return res.status(400).json({ message: "Group name is required" });
    const ownerId = req.user._id;
    const members = Array.from(new Set([ownerId, ...memberIds]));
    let avatarUrl = "";
    if (avatar) {
      const upload = await cloudinary.uploader.upload(avatar);
      avatarUrl = upload.secure_url;
    }
    const group = await Group.create({ name, ownerId, members, avatar: avatarUrl });
    return res.status(201).json(group);
  } catch (e) {
    console.error("Error in createGroup:", e);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const myGroups = async (req, res) => {
  try {
    const userId = req.user._id;
    const groups = await Group.find({ members: userId });
    res.status(200).json(groups);
  } catch (e) {
    console.error("Error in myGroups:", e);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateMembers = async (req, res) => {
  try {
    const { id } = req.params; // groupId
    const { add = [], remove = [] } = req.body;
    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!group.ownerId.equals(req.user._id)) return res.status(403).json({ message: "Forbidden" });
    const current = new Set(group.members.map((m) => m.toString()));
    add.forEach((uid) => current.add(uid.toString()));
    remove.forEach((uid) => current.delete(uid.toString()));
    group.members = Array.from(current);
    await group.save();
    res.status(200).json(group);
  } catch (e) {
    console.error("Error in updateMembers:", e);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getGroupMessages = async (req, res) => {
  try {
    const { id } = req.params; // groupId
    const userId = req.user._id;
    const group = await Group.findById(id);
    if (!group || !group.members.map((m) => m.toString()).includes(userId.toString())) {
      return res.status(403).json({ message: "Access denied" });
    }
    const messages = await GroupMessage.find({ groupId: id });
    const hydrated = await hydrateMessagesWithSender(messages);
    res.status(200).json(hydrated);
  } catch (e) {
    console.error("Error in getGroupMessages:", e);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const sendGroupMessage = async (req, res) => {
  try {
    const { id } = req.params; // groupId
    const { text, image } = req.body;
    const senderId = req.user._id;
    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!group.members.map((m) => m.toString()).includes(senderId.toString())) {
      return res.status(403).json({ message: "Not a member" });
    }
    if (!text && !image) return res.status(400).json({ message: "Text or image is required" });
    let imageUrl;
    if (image) {
      const upload = await cloudinary.uploader.upload(image);
      imageUrl = upload.secure_url;
    }
    const msg = await GroupMessage.create({ groupId: id, senderId, text, image: imageUrl });
    const sender = await User.findById(senderId).select("fullName profilePic");
    const payload = {
      ...msg.toObject(),
      senderName: sender?.fullName || "",
      senderProfilePic: sender?.profilePic || "",
    };
    // notify members
    for (const memberId of group.members) {
      if (memberId.toString() === senderId.toString()) continue;
      const sid = getReceiverSocketId(memberId.toString());
      if (sid) io.to(sid).emit("groupMessage", payload);
    }
    res.status(201).json(payload);
  } catch (e) {
    console.error("Error in sendGroupMessage:", e);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateGroupAvatar = async (req, res) => {
  try {
    const { id } = req.params; // groupId
    const { avatar } = req.body;
    const group = await Group.findById(id);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!group.ownerId.equals(req.user._id)) return res.status(403).json({ message: "Forbidden" });
    if (!avatar) return res.status(400).json({ message: "Avatar is required" });
    const upload = await cloudinary.uploader.upload(avatar);
    group.avatar = upload.secure_url;
    await group.save();
    res.status(200).json(group);
  } catch (e) {
    console.error("Error in updateGroupAvatar:", e);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteGroupMessage = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id, messageId } = req.params; // groupId, messageId
    const { mode } = req.body; // 'me' | 'everyone'
    const msg = await GroupMessage.findById(messageId);
    if (!msg || msg.groupId.toString() !== id) return res.status(404).json({ message: "Message not found" });

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
      // notify group members to remove/mark message
      const group = await Group.findById(id);
      if (group) {
        for (const memberId of group.members) {
          if (memberId.toString() === userId.toString()) continue;
          const sid = getReceiverSocketId(memberId.toString());
          if (sid) io.to(sid).emit("groupMessageDeleted", { id: msg._id, groupId: id });
        }
      }
      return res.status(200).json({ id: messageId, mode: "everyone" });
    }
    return res.status(400).json({ message: "Invalid mode" });
  } catch (e) {
    console.error("Error in deleteGroupMessage:", e);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const reactToGroupMessage = async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupMessageId } = req.params;
    const { emoji } = req.body;
    if (!emoji) return res.status(400).json({ message: "Emoji required" });
    const msg = await GroupMessage.findById(groupMessageId);
    if (!msg) return res.status(404).json({ message: "Group message not found" });
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

    // notify each group member (including reacter)
    const group = await Group.findById(msg.groupId);
    if (group) {
      const payload = { id: msg._id, reactions: reactionsPayload };
      for (const memberId of group.members) {
        const sid = getReceiverSocketId(memberId.toString());
        if (sid) io.to(sid).emit("groupMessageReacted", payload);
      }
    }
    res.status(200).json({ id: msg._id, reactions: reactionsPayload });
  } catch (e) {
    console.error("reactToGroupMessage error:", e);
    res.status(500).json({ message: "Internal server error" });
  }
};


