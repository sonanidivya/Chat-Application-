import { useEffect, useState } from "react";
import { useGroupStore } from "../store/useGroupStore";
import { useChatStore } from "../store/useChatStore";
import toast from "react-hot-toast";

function CreateGroupModal({ onClose }) {
  const { createGroup } = useGroupStore();
  const { getAllContacts, allContacts } = useChatStore();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState([]);

  useEffect(() => { getAllContacts(); }, [getAllContacts]);

  const toggle = (id) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleCreate = async () => {
    const safeName = name.trim();
    if (!safeName) { toast.error("Group name required"); return; }
    // Ensure memberIds are valid string array, no accidental blanks/dupes
    const memberIds = Array.isArray(selected) ? Array.from(new Set(selected.filter((id) => !!id && typeof id === "string"))) : [];
    try {
      const group = await createGroup({ name: safeName, memberIds });
      if (group) onClose();
    } catch (err) {
      // Will already toast, but let's log for debugging
      console.error("Create group error:", err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 w-[420px] max-h-[80vh] overflow-y-auto">
        <h3 className="text-slate-200 font-medium mb-3">Create Group</h3>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Group name" className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg py-2 px-3 mb-3" />
        <div className="space-y-2 mb-4">
          {allContacts.map((c) => (
            <label key={c._id} className="flex items-center gap-3 text-slate-300">
              <input type="checkbox" checked={selected.includes(c._id)} onChange={() => toggle(c._id)} />
              <img src={c.profilePic || "/avatar.png"} className="w-6 h-6 rounded-full" />
              <span>{c.fullName}</span>
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate}>Create</button>
        </div>
      </div>
    </div>
  );
}
export default CreateGroupModal;


