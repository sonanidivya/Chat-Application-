function ImageLightbox({ src, onClose }) {
  if (!src) return null;
  return (
    <div className="fixed inset-0 bg-black/80 z-50 grid place-items-center" onClick={onClose}>
      <img src={src} alt="Preview" className="max-w-[90vw] max-h-[90vh] rounded-lg border border-white/10" />
    </div>
  );
}

export default ImageLightbox;


