import { useRef, useState } from "react";
import { ImageIcon, SendIcon, XIcon } from "lucide-react";
import toast from "react-hot-toast";
import { useGroupStore } from "../store/useGroupStore";
import { useAuthStore } from "../store/useAuthStore";

function GroupMessageInput() {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const { selectedGroup, sendGroupMessage } = useGroupStore();
  const { socket } = useAuthStore();

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;
    sendGroupMessage(selectedGroup._id, { text: text.trim(), image: imagePreview });
    setText("");
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (socket) {
      const myId = (useAuthStore.getState().authUser || {})._id;
      const memberIds = (selectedGroup?.members || []).filter((id) => String(id) !== String(myId));
      socket.emit("groupStopTyping", { groupId: selectedGroup._id, memberIds });
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file?.type?.startsWith("image/")) return toast.error("Please select an image file");
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  return (
    <div className="p-4 border-t border-slate-700/50">
      {imagePreview && (
        <div className="max-w-3xl mx-auto mb-3 flex items-center">
          <div className="relative">
            <img src={imagePreview} alt="Preview" className="w-20 h-20 object-cover rounded-lg border border-slate-700" />
            <button onClick={() => { setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-slate-200 hover:bg-slate-700" type="button">
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSend} className="max-w-3xl mx-auto flex space-x-4">
        <input
          type="text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (socket) {
              const hasText = e.target.value.trim().length > 0;
              const myId = (useAuthStore.getState().authUser || {})._id;
              const memberIds = (selectedGroup?.members || []).filter((id) => String(id) !== String(myId));
              if (hasText) socket.emit("groupTyping", { groupId: selectedGroup._id, memberIds });
              else socket.emit("groupStopTyping", { groupId: selectedGroup._id, memberIds });
            }
          }}
          className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-lg py-2 px-4 text-slate-200"
          placeholder="Type your message..."
        />
        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
        <button type="button" onClick={() => fileInputRef.current?.click()} className="bg-slate-800/50 text-slate-400 hover:text-slate-200 rounded-lg px-4 transition-colors">
          <ImageIcon className="w-5 h-5" />
        </button>
        <button type="submit" disabled={!text.trim() && !imagePreview} className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-lg px-4 py-2 font-medium hover:from-cyan-600 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
          <SendIcon className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}

export default GroupMessageInput;


