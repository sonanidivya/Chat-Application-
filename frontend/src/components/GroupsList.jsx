import { useEffect, useState } from "react";
import { useGroupStore } from "../store/useGroupStore";
import { useChatStore } from "../store/useChatStore";
import UsersLoadingSkeleton from "./UsersLoadingSkeleton";
import CreateGroupModal from "./CreateGroupModal";

function GroupsList() {
  const { groups, fetchMyGroups, isLoading, setSelectedGroup } = useGroupStore();
  const { setActiveTab } = useChatStore();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchMyGroups();
  }, [fetchMyGroups]);

  if (isLoading) return <UsersLoadingSkeleton />;

  return (
    <>
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-slate-300 text-sm">Groups</h4>
        <button className="btn btn-xs btn-ghost text-cyan-400" onClick={() => setOpen(true)}>New Group</button>
      </div>
      {groups.map((g) => (
        <div key={g._id} className="bg-cyan-500/10 p-4 rounded-lg cursor-pointer hover:bg-cyan-500/20 transition-colors" onClick={() => { setSelectedGroup(g); setActiveTab("groups"); }}>
          <div className="flex items-center gap-3">
            <div className="avatar online">
              <div className="size-12 rounded-full">
                <img src={g.avatar || "/group.png"} alt={g.name} />
              </div>
            </div>
            <h4 className="text-slate-200 font-medium truncate">{g.name}</h4>
          </div>
        </div>
      ))}

      {open && <CreateGroupModal onClose={() => setOpen(false)} />}
    </>
  );
}
export default GroupsList;


