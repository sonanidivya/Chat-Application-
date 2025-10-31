import { useAuthStore } from "../store/useAuthStore";
import { axiosInstance } from "../lib/axios";
import { useChatStore } from "../store/useChatStore";

function MessageActions({ message, isOwner }) {
  const { selectedUser, messages, set } = useChatStore.getState ? useChatStore.getState() : { selectedUser: null };
  const { authUser } = useAuthStore();

  const deleteForMe = async () => {
    try {
      await axiosInstance.post(`/messages/delete/${message._id}`, { mode: "me" });
      const current = useChatStore.getState().messages;
      useChatStore.getState().set({ messages: current.filter((m) => m._id !== message._id) });
    } catch {}
  };

  const deleteForEveryone = async () => {
    try {
      await axiosInstance.post(`/messages/delete/${message._id}`, { mode: "everyone" });
      const current = useChatStore.getState().messages;
      useChatStore.getState().set({ messages: current.map((m) => (m._id === message._id ? { ...m, isDeleted: true, text: null, image: null } : m)) });
    } catch {}
  };

  return (
    <div className="dropdown dropdown-end">
      <div tabIndex={0} role="button" className="btn btn-xs btn-ghost text-slate-300">⋮</div>
      <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-slate-800 rounded-box w-48">
        <li><button onClick={deleteForMe}>Delete for me</button></li>
        {isOwner && <li><button onClick={deleteForEveryone}>Delete for everyone</button></li>}
      </ul>
    </div>
  );
}

export default MessageActions;


