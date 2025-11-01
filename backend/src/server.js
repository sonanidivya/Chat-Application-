import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import cors from "cors";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import groupRoutes from "./routes/group.route.js";
import botRoutes from "./routes/bot.route.js";
import { connectDB } from "./lib/db.js";
import { ENV } from "./lib/env.js";
import { app, server } from "./lib/socket.js";
import User from "./models/User.js";
import bcrypt from "bcryptjs";
import cors from "cors";

app.use(
  cors({
    origin: [
      "https://chat-application-q2lrb3s7y-sonanidivy1008-gmailcoms-projects.vercel.app",
      "http://localhost:5173"
    ],
    credentials: true,
  })
);

const __dirname = path.resolve();

const PORT = ENV.PORT || 3000;

app.use(express.json({ limit: "5mb" })); // req.body
app.use(cors({ origin: ENV.CLIENT_URL, credentials: true }));
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/bot", botRoutes);
app.get("/api/users/bulk", async (req, res) => {
  let ids = req.query._ids;
  if (!ids) return res.json([]);
  if (typeof ids === "string") ids = ids.split(",");
  const users = await User.find({ _id: { $in: ids } }, "_id fullName profilePic");
  res.json(users);
});

// make ready for deployment
if (ENV.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (_, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

const ensureLunaUser = async () => {
  const email = "luna@chatify.ai";
  const exists = await User.findOne({ email });
  if (exists) return exists;
  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash("luna_system_account", salt);
  const luna = await User.create({
    email,
    fullName: "Luna (AI)",
    password: hashed,
    profilePic: "/avatar-bot.svg",
  });
  return luna;
};

const start = async () => {
  try {
    await connectDB();
    await ensureLunaUser();
    server.listen(PORT, () => {
      console.log("Server running on port: " + PORT);
    });
  } catch (e) {
    console.error("Failed to start server:", e);
    process.exit(1);
  }
};

start();
