import { useEffect, useMemo, useRef, useState } from "react";
import { useGroupStore } from "../store/useGroupStore";
import { useAuthStore } from "../store/useAuthStore";
import AddMembersModal from "./AddMembersModal";
import { axiosInstance } from "../lib/axios";
import ImageLightbox from "./ImageLightbox";

function GroupDetailsSidebar() {
  const { selectedGroup, updateGroupMembers } = useGroupStore();
  const { authUser } = useAuthStore();
  const [openAdd, setOpenAdd] = useState(false);
  const [showImg, setShowImg] = useState(false);
  const fileRef = useRef(null);

  const isOwner = useMemo(() => String(selectedGroup?.ownerId) === String(authUser?._id), [selectedGroup, authUser]);
  const [memberMap, setMemberMap] = useState({});

  useEffect(() => {
    async function load() {
      if (!selectedGroup?.members?.length) return;
      const res = await axiosInstance.get(`/users/bulk`, { params: { _ids: selectedGroup.members.join(",") } });
      const arr = res.data || [];
      const m = {}; arr.forEach((u) => m[String(u._id)] = u);
      setMemberMap(m);
    }
    load();
  }, [selectedGroup]);

  const removeMember = async (uid) => {
    if (!selectedGroup?._id) return;
    await updateGroupMembers(selectedGroup._id, { remove: [uid] });
  };

  const onPickAvatar = () => fileRef.current?.click();
  const onAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result;
      const { updateGroupAvatar } = useGroupStore.getState();
      await updateGroupAvatar(selectedGroup._id, base64);
    };
    reader.readAsDataURL(file);
  };

  return (
    <aside className="w-72 border-l border-slate-700/50 bg-slate-900/50 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="avatar online">
          <div className="w-12 rounded-full overflow-hidden">
            <img src={selectedGroup.avatar || "/group.png"} onClick={() => setShowImg(true)} className="cursor-zoom-in" />
          </div>
        </div>
        <div>
          <div className="text-slate-200 font-medium">{selectedGroup.name}</div>
          <div className="text-slate-400 text-xs">{selectedGroup.members?.length || 0} members</div>
        </div>
      </div>

      {isOwner && (
        <div className="flex gap-2">
          <button className="btn btn-sm btn-primary" onClick={() => setOpenAdd(true)}>Add Members</button>
          <button className="btn btn-sm btn-ghost text-slate-300" onClick={onPickAvatar}>Change Photo</button>
          <input type="file" accept="image/*" ref={fileRef} onChange={onAvatarChange} className="hidden" />
        </div>
      )}

      <div className="mt-2">
        <div className="text-slate-400 text-xs mb-2">Members</div>
        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
          {(selectedGroup.members || []).map((uid) => (
            <div key={uid} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={(memberMap[String(uid)]?.profilePic) || "/avatar.png"} className="w-6 h-6 rounded-full" />
                <span className="text-slate-300 text-sm truncate">{memberMap[String(uid)]?.fullName || uid}</span>
              </div>
              {isOwner && String(uid) !== String(authUser?._id) && (
                <button className="btn btn-xs btn-ghost text-red-400" onClick={() => removeMember(uid)}>Remove</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {openAdd && <AddMembersModal onClose={() => setOpenAdd(false)} />}
      {showImg && <ImageLightbox src={selectedGroup.avatar || "/group.png"} onClose={() => setShowImg(false)} />}
    </aside>
  );
}

export default GroupDetailsSidebar;


