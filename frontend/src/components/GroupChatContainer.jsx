import { useEffect, useRef, useState } from "react";
import { useGroupStore } from "../store/useGroupStore";
import { useAuthStore } from "../store/useAuthStore";
import MessagesLoadingSkeleton from "./MessagesLoadingSkeleton";
import GroupMessageInput from "./GroupMessageInput";
import GroupDetailsSidebar from "./GroupDetailsSidebar";
import ImageLightbox from "./ImageLightbox";
import MessageContextMenu from "./MessageContextMenu";
import { axiosInstance } from "../lib/axios";

function GroupChatContainer() {
  const { selectedGroup, getGroupMessages, groupMessages, isLoading, subscribeToGroup, unsubscribeFromGroup, isGroupTyping } = useGroupStore();
  const { authUser } = useAuthStore();
  const endRef = useRef(null);
  const [memberMap, setMemberMap] = useState({});

  // Fetch group members when group opens
  useEffect(() => {
    async function fetchMembers() {
      if (!selectedGroup || !Array.isArray(selectedGroup.members)) return;
      const ids = selectedGroup.members;
      const res = await axiosInstance.get(`/users/bulk`, { params: { _ids: ids.join(",") } });
      const arr = res.data || [];
      const m = {};
      for (const u of arr) m[String(u._id)] = u;
      setMemberMap(m);
    }
    fetchMembers();
  }, [selectedGroup]);

  useEffect(() => {
    getGroupMessages(selectedGroup._id);
    subscribeToGroup();
    return () => unsubscribeFromGroup();
  }, [selectedGroup, getGroupMessages, subscribeToGroup, unsubscribeFromGroup]);

  useEffect(() => { if (endRef.current) endRef.current.scrollIntoView({ behavior: "smooth" }); }, [groupMessages]);

  const [showDetails, setShowDetails] = useState(false);
  const [lightbox, setLightbox] = useState("");
  const [context, setContext] = useState({ open: false, x: 0, y: 0, message: null });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between bg-slate-800/50 border-b border-slate-700/50 px-6 py-4">
        <div className="avatar online"><div className="w-12 rounded-full"><img src={selectedGroup.avatar || "/group.png"} /></div></div>
        <div>
          <h3 className="text-slate-200 font-medium">{selectedGroup.name}</h3>
          {isGroupTyping && <p className="text-slate-400 text-sm">Typing…</p>}
        </div>
        <div className="ml-auto">
          <button className="btn btn-ghost btn-sm text-slate-300" onClick={() => setShowDetails((s) => !s)}>
            {showDetails ? "Hide Details" : "Show Details"}
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 min-h-0 px-6 overflow-y-auto py-6">
          {groupMessages.length > 0 && !isLoading ? (
            <div className="max-w-3xl mx-auto space-y-2">
            {groupMessages.map((msg) => {
              const user = memberMap?.[String(msg.senderId)] || {};
              const isMe = String(msg.senderId) === String(authUser._id);
              const senderLabel = isMe ? "You" : (msg.senderName || user.fullName || "Member");
                return (
                <div key={msg._id} className={`chat ${isMe ? "chat-end" : "chat-start"}`}
                  onContextMenu={(e) => { e.preventDefault(); setContext({ open: true, x: e.clientX, y: e.clientY, message: msg }); }}
                >
                    <div className="chat-image avatar">
                      <div className="w-8 rounded-full">
                      <img src={msg.senderProfilePic || user.profilePic || "/avatar.png"} alt={senderLabel || "User"} />
                      </div>
                    </div>
                  <div className={`chat-bubble relative max-w-[80%] break-words whitespace-pre-wrap leading-relaxed ${isMe ? "bg-cyan-600 text-white" : "bg-slate-800 text-slate-200"}`}
                    onContextMenu={(e) => { e.preventDefault(); setContext({ open: true, x: e.clientX, y: e.clientY, message: msg }); }}
                  >
                    <div className="text-xs font-semibold mb-1">{senderLabel}</div>
                    {msg.isDeleted ? (
                      <p className="text-xs opacity-70 italic">This message was deleted</p>
                    ) : (<>
                      {msg.image && (
                        <img src={msg.image} alt="Shared" className="rounded-lg max-h-64 object-cover cursor-zoom-in" onClick={() => setLightbox(msg.image)} />
                      )}
                      {msg.text && <p className="mt-2">{msg.text}</p>}
                    </>)}
                    <p className="text-[10px] mt-1 opacity-75 flex items-center gap-1">{new Date(msg.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</p>
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {Object.entries(msg.reactions)
                          .map(([e, list]) => [e, Array.isArray(list) ? list : []])
                          .filter(([, arr]) => arr.length > 0)
                          .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
                          .map(([e, arr]) => {
                            const iReacted = arr.some(r => String(r.userId) === String(authUser._id));
                            const names = arr
                              .map(r => memberMap[String(r.userId)]?.fullName || (String(r.userId) === String(authUser._id) ? "You" : "Member"))
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
                    {/* actions shown via context menu */}
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
              {isGroupTyping && (
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
          ) : isLoading ? (
            <MessagesLoadingSkeleton />
          ) : (
            <div className="h-full grid place-content-center text-slate-400">Start your first message</div>
          )}
        </div>
        {showDetails && <GroupDetailsSidebar />}
      </div>

      <GroupMessageInput />
      <MessageContextMenu
        open={context.open}
        x={context.x}
        y={context.y}
        onClose={() => setContext({ open: false, x: 0, y: 0, message: null })}
        onEmojiClick={async (emoji) => {
          const m = context.message; if (!m) return; setContext({ open: false, x: 0, y: 0, message: null });
          try {
            await axiosInstance.patch(`/groups/messages/${m._id}/react`, { emoji });
          } catch (e) {
            const msg = e.response?.data?.message || e.message || "Failed to react to message";
            window?.toast ? window.toast.error(msg) : alert(msg);
            return;
          }
          const current = useGroupStore.getState().groupMessages;
          const updated = current.map((x) => {
            if (x._id !== m._id) return x;
            const reactions = { ...(x.reactions || {}) };
            const list = Array.isArray(reactions[emoji]) ? [...reactions[emoji]] : [];
            const idx = list.findIndex(r => String(r.userId) === String(authUser._id));
            if (idx >= 0) list.splice(idx, 1); else list.push({ userId: authUser._id, emoji });
            reactions[emoji] = list;
            return { ...x, reactions };
          });
          useGroupStore.setState({ groupMessages: updated });
        }}
        items={[
          {
            label: "Delete for me",
            onClick: async () => {
              const m = context.message; if (!m) return; setContext({ open: false, x: 0, y: 0, message: null });
              await axiosInstance.post(`/groups/${selectedGroup._id}/messages/${m._id}/delete`, { mode: "me" });
              const current = useGroupStore.getState().groupMessages;
              useGroupStore.setState({ groupMessages: current.filter((x) => x._id !== m._id) });
            },
          },
          ...((context.message && String(context.message.senderId) === String(authUser._id) && !context.message.isDeleted)
            ? [{ label: "Delete for everyone", danger: true, onClick: async () => {
                  const m = context.message; if (!m) return; setContext({ open: false, x: 0, y: 0, message: null });
                  await axiosInstance.post(`/groups/${selectedGroup._id}/messages/${m._id}/delete`, { mode: "everyone" });
                  const current = useGroupStore.getState().groupMessages;
                  useGroupStore.setState({ groupMessages: current.map((x) => (x._id === m._id ? { ...x, isDeleted: true, text: null, image: null } : x)) });
                }}]
            : [])
        ]}
      />
      {lightbox && <ImageLightbox src={lightbox} onClose={() => setLightbox("")} />}
    </div>
  );
}

export default GroupChatContainer;


