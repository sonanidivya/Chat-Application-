import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// A polished WhatsApp/Discord‑style context menu with reaction row and clamped positioning
function MessageContextMenu({ x, y, open, items = [], onClose, onEmojiClick }) {
  const menuRef = useRef(null);
  // Pre-clamp with estimated size to avoid initial flicker/overflow
  const estW = 260, estH = 220, margin = 8;
  const preLeft = Math.min(Math.max(margin, x), Math.max(margin, window.innerWidth - estW - margin));
  const preTop = Math.min(Math.max(margin, y), Math.max(margin, window.innerHeight - estH - margin));
  const [pos, setPos] = useState({ left: preLeft, top: preTop });
  const emojis = ["👍", "❤️", "😂", "😮", "😢", "🙏", "➕"]; // last is a placeholder for more

  useLayoutEffect(() => {
    if (!open) return;
    // After render, clamp to viewport (8px margin)
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const maxLeft = window.innerWidth - rect.width - margin;
    const maxTop = window.innerHeight - rect.height - margin;
    // If click is too close to right edge, open left of pointer by menu width
    const preferLeft = x > maxLeft ? x - rect.width : x;
    const left = Math.min(Math.max(margin, preferLeft), Math.max(margin, maxLeft));
    const top = Math.min(Math.max(margin, y), Math.max(margin, maxTop));
    setPos({ left, top });
  }, [open, x, y]);

  useEffect(() => {
    if (!open) return;
    const onClick = () => onClose?.();
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("click", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const renderItem = (it, idx) => {
    if (it === "---" || it?.separator) return <div key={`sep-${idx}`} className="my-1 h-px bg-slate-700/60" />;
    return (
      <button
        key={idx}
        className={`w-full text-left px-3 py-2 rounded hover:bg-slate-700/60 focus:bg-slate-700/60 outline-none ${it.danger ? "text-red-400" : "text-slate-200"}`}
        onClick={it.onClick}
      >
        <span className="text-sm">{it.label}</span>
      </button>
    );
  };

  const menuEl = (
    <div ref={menuRef} className="fixed z-[1000] min-w-[220px] max-w-[280px] rounded-xl border border-slate-700/60 bg-slate-900/95 backdrop-blur shadow-xl p-2" style={{ left: pos.left, top: pos.top }}>
      {/* Emoji/Reactions Row */}
      <div className="flex items-center gap-2 px-2 py-1">
        {emojis.map((e, i) => (
          <button key={i} className="h-7 w-7 grid place-items-center rounded-full hover:bg-slate-700/60" onClick={() => onEmojiClick?.(e)}>
            <span className="text-base leading-none">{e}</span>
          </button>
        ))}
      </div>
      <div className="my-1 h-px bg-slate-700/60" />
      <div className="flex flex-col">
        {items.map(renderItem)}
      </div>
    </div>
  );

  return createPortal(menuEl, document.body);
}

export default MessageContextMenu;


