import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";

export const useGroupStore = create((set, get) => ({
  groups: [],
  isLoading: false,
  selectedGroup: null,
  groupMessages: [],
  isGroupTyping: false,

  setSelectedGroup: (g) => set({ selectedGroup: g, groupMessages: [], isGroupTyping: false }),

  fetchMyGroups: async () => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.get("/groups/mine");
      set({ groups: res.data });
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load groups");
    } finally {
      set({ isLoading: false });
    }
  },

  createGroup: async ({ name, memberIds, avatar }) => {
    try {
      const res = await axiosInstance.post("/groups", { name, memberIds, avatar });
      set({ groups: [res.data, ...get().groups] });
      toast.success("Group created");
      return res.data;
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to create group");
    }
  },

  updateGroupMembers: async (groupId, { add = [], remove = [] }) => {
    try {
      const res = await axiosInstance.put(`/groups/${groupId}/members`, { add, remove });
      const updated = res.data;
      const groups = get().groups.map((g) => (g._id === updated._id ? updated : g));
      set({ groups, selectedGroup: updated });
      toast.success("Group updated");
      return updated;
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to update members");
    }
  },

  updateGroupAvatar: async (groupId, base64) => {
    try {
      const res = await axiosInstance.put(`/groups/${groupId}/avatar`, { avatar: base64 });
      const updated = res.data;
      const groups = get().groups.map((g) => (g._id === updated._id ? updated : g));
      set({ groups, selectedGroup: updated });
      toast.success("Group photo updated");
      return updated;
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to update group photo");
    }
  },

  getGroupMessages: async (groupId) => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.get(`/groups/${groupId}/messages`);
      set({ groupMessages: res.data });
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load messages");
    } finally {
      set({ isLoading: false });
    }
  },

  sendGroupMessage: async (groupId, { text, image }) => {
    const { groupMessages } = get();
    const { authUser } = useAuthStore.getState();
    const tempId = `temp-${Date.now()}`;
    const optimistic = { _id: tempId, groupId, senderId: authUser._id, text, image, createdAt: new Date().toISOString(), isOptimistic: true };
    set({ groupMessages: [...groupMessages, optimistic] });
    try {
      const res = await axiosInstance.post(`/groups/${groupId}/messages`, { text, image });
      const current = get().groupMessages;
      const withoutOptimistic = current.filter((m) => !m.isOptimistic);
      // replace optimistic with server-confirmed message
      set({ groupMessages: [...withoutOptimistic, res.data] });
    } catch (e) {
      set({ groupMessages: groupMessages });
      toast.error(e?.response?.data?.message || "Failed to send message");
    }
  },

  subscribeToGroup: () => {
    const { selectedGroup } = get();
    if (!selectedGroup) return;
    const socket = useAuthStore.getState().socket;

    socket.on("groupMessage", (msg) => {
      if (String(msg.groupId) !== String(selectedGroup._id)) return;
      const current = get().groupMessages;
      set({ groupMessages: [...current, msg] });
    });

    const myId = useAuthStore.getState().authUser?._id;
    socket.on("groupTyping", ({ groupId, senderId }) => {
      if (String(groupId) === String(selectedGroup._id) && String(senderId) !== String(myId)) set({ isGroupTyping: true });
    });
    socket.on("groupStopTyping", ({ groupId, senderId }) => {
      if (String(groupId) === String(selectedGroup._id) && String(senderId) !== String(myId)) set({ isGroupTyping: false });
    });

    socket.on("groupMessageDeleted", ({ id, groupId }) => {
      if (String(groupId) !== String(selectedGroup._id)) return;
      const current = get().groupMessages;
      const updated = current.map((m) => (m._id === id ? { ...m, isDeleted: true, text: null, image: null } : m));
      set({ groupMessages: updated });
    });

    socket.on("groupMessageReacted", ({ id, reactions }) => {
      try {
        console.log("[socket] groupMessageReacted received", { id, reactions });
        const current = get().groupMessages;
        const updated = current.map((m) => (String(m._id) === String(id) ? { ...m, reactions } : m));
        set({ groupMessages: updated });
      } catch (e) {
        console.error("[socket] groupMessageReacted handler error", e);
      }
    });
  },

  unsubscribeFromGroup: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("groupMessage");
    socket.off("groupTyping");
    socket.off("groupStopTyping");
    socket.off("groupMessageDeleted");
    socket.off("groupMessageReacted");
  },
}));


