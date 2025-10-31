import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  allContacts: [],
  chats: [],
  messages: [],
  isPartnerTyping: false,
  activeTab: "chats",
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  isSoundEnabled: JSON.parse(localStorage.getItem("isSoundEnabled")) === true,

  toggleSound: () => {
    localStorage.setItem("isSoundEnabled", !get().isSoundEnabled);
    set({ isSoundEnabled: !get().isSoundEnabled });
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedUser: (selectedUser) => set({ selectedUser, isPartnerTyping: false }),

  getAllContacts: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/contacts");
      set({ allContacts: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },
  getMyChatPartners: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/chats");
      set({ chats: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessagesByUserId: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    const { authUser } = useAuthStore.getState();

    const tempId = `temp-${Date.now()}`;

    const optimisticMessage = {
      _id: tempId,
      senderId: authUser._id,
      receiverId: selectedUser._id,
      text: messageData.text,
      image: messageData.image,
      createdAt: new Date().toISOString(),
      isOptimistic: true, // flag to identify optimistic messages (optional)
    };
    // immidetaly update the ui by adding the message
    set({ messages: [...messages, optimisticMessage] });

    try {
      if (selectedUser?.email === "luna@chatify.ai") {
        const history = messages.slice(-10).map((m) => ({
          role: m.senderId === authUser._id ? "user" : "assistant",
          content: m.text || "",
        }));

        set({ isPartnerTyping: true });

        let res;
        try {
          res = await axiosInstance.post(`/bot/chat`, { message: messageData.text, history });
        } catch (err) {
          set({ isPartnerTyping: false });
          const msg = err?.response?.data?.message || "Luna is unavailable";
          const details = err?.response?.data?.details;
          toast.error(details ? `${msg}: ${String(details).slice(0, 200)}` : msg);
          return;
        }
        const botReply = {
          _id: `bot-${Date.now()}`,
          senderId: selectedUser._id,
          receiverId: authUser._id,
          text: res.data.reply,
          image: null,
          createdAt: new Date().toISOString(),
        };
        const withoutOptimistic = messages.filter((m) => !m.isOptimistic);
        set({ messages: [...withoutOptimistic, optimisticMessage, botReply], isPartnerTyping: false });
      } else {
        const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
        set({ messages: messages.concat(res.data) });
      }
    } catch (error) {
      // remove optimistic message on failure
      set({ messages: messages, isPartnerTyping: false });
      toast.error(error.response?.data?.message || "Something went wrong");
    }
  },

  subscribeToMessages: () => {
    const { selectedUser, isSoundEnabled } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;

    socket.on("newMessage", (newMessage) => {
      const isMessageSentFromSelectedUser = newMessage.senderId === selectedUser._id;
      if (!isMessageSentFromSelectedUser) return;

      const currentMessages = get().messages;
      set({ messages: [...currentMessages, newMessage] });

      if (isSoundEnabled) {
        const notificationSound = new Audio("/sounds/notification.mp3");

        notificationSound.currentTime = 0; // reset to start
        notificationSound.play().catch((e) => console.log("Audio play failed:", e));
      }
    });

    socket.on("typing", ({ senderId }) => {
      if (selectedUser && senderId === selectedUser._id) {
        set({ isPartnerTyping: true });
      }
    });

    socket.on("stopTyping", ({ senderId }) => {
      if (selectedUser && senderId === selectedUser._id) {
        set({ isPartnerTyping: false });
      }
    });

    socket.on("messageDeleted", ({ id }) => {
      const current = get().messages;
      const updated = current.map((m) => (m._id === id ? { ...m, isDeleted: true, text: null, image: null } : m));
      set({ messages: updated });
    });

    socket.on("messageReacted", ({ id, reactions }) => {
      try {
        console.log("[socket] messageReacted received", { id, reactions });
        const current = get().messages;
        const updated = current.map((m) => (String(m._id) === String(id) ? { ...m, reactions } : m));
        set({ messages: updated });
      } catch (e) {
        console.error("[socket] messageReacted handler error", e);
      }
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
    socket.off("messageDeleted");
    socket.off("typing");
    socket.off("stopTyping");
    socket.off("messageReacted");
  },
}));
