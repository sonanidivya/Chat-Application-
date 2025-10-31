import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { createGroup, myGroups, updateMembers, getGroupMessages, sendGroupMessage, updateGroupAvatar, deleteGroupMessage, reactToGroupMessage } from "../controllers/group.controller.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protectRoute);

router.post("/", createGroup);
router.get("/mine", myGroups);
router.put("/:id/members", updateMembers);
router.put("/:id/avatar", updateGroupAvatar);
router.get("/:id/messages", getGroupMessages);
router.post("/:id/messages", sendGroupMessage);
router.post("/:id/messages/:messageId/delete", deleteGroupMessage);
router.patch("/messages/:groupMessageId/react", requireAuth, reactToGroupMessage);

// Bulk fetch for group members (GET /api/users/bulk?_ids=id1,id2,id3)
router.get("/api/users/bulk", async (req, res) => {
  let ids = req.query._ids;
  if (!ids) return res.json([]);
  if (typeof ids === "string") ids = ids.split(",");
  const users = await User.find({ _id: { $in: ids } }, "_id fullName profilePic");
  res.json(users);
});

export default router;


