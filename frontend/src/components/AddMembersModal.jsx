import { useEffect, useMemo, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";

function AddMembersModal({ onClose }) {
  const { allContacts, getAllContacts } = useChatStore();
  const { selectedGroup, updateGroupMembers } = useGroupStore();
  const [selected, setSelected] = useState([]);

  useEffect(() => { getAllContacts(); }, [getAllContacts]);

  const existing = useMemo(() => new Set((selectedGroup?.members || []).map(String)), [selectedGroup]);
  const candidates = useMemo(() => allContacts.filter((c) => !existing.has(String(c._id))), [allContacts, existing]);

  const toggle = (id) => setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const handleAdd = async () => {
    if (!selectedGroup?._id || selected.length === 0) return onClose();
    const updated = await updateGroupMembers(selectedGroup._id, { add: selected });
    if (updated) onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 w-[420px] max-h-[80vh] overflow-y-auto">
        <h3 className="text-slate-200 font-medium mb-3">Add Members</h3>
        <div className="space-y-2 mb-4">
          {candidates.map((c) => (
            <label key={c._id} className="flex items-center gap-3 text-slate-300">
              <input type="checkbox" checked={selected.includes(c._id)} onChange={() => toggle(c._id)} />
              <img src={c.profilePic || "/avatar.png"} className="w-6 h-6 rounded-full" />
              <span>{c.fullName}</span>
            </label>
          ))}
          {candidates.length === 0 && <div className="text-slate-500 text-sm">No more contacts to add</div>}
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdd} disabled={selected.length===0}>Add</button>
        </div>
      </div>
    </div>
  );
}

export default AddMembersModal;


