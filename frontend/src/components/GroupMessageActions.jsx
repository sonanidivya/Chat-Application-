import { useGroupStore } from "../store/useGroupStore";
import { useAuthStore } from "../store/useAuthStore";
import { axiosInstance } from "../lib/axios";

function GroupMessageActions({ message, isOwner }) {
  const { selectedGroup, groupMessages } = useGroupStore();

  const deleteForMe = async () => {
    try {
      await axiosInstance.post(`/groups/${selectedGroup._id}/messages/${message._id}/delete`, { mode: "me" });
      const current = useGroupStore.getState().groupMessages;
      useGroupStore.getState().set({ groupMessages: current.filter((m) => m._id !== message._id) });
    } catch {}
  };

  const deleteForEveryone = async () => {
    try {
      await axiosInstance.post(`/groups/${selectedGroup._id}/messages/${message._id}/delete`, { mode: "everyone" });
      const current = useGroupStore.getState().groupMessages;
      useGroupStore.getState().set({ groupMessages: current.map((m) => (m._id === message._id ? { ...m, isDeleted: true, text: null, image: null } : m)) });
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

export default GroupMessageActions;


