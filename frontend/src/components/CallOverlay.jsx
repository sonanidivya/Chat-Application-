import { useEffect, useRef } from "react";
import { useCallStore } from "../store/useCallStore";
import { useAuthStore } from "../store/useAuthStore";

function CallOverlay() {
  const { inCall, localStream, remoteStream, endCall, acceptOffer, handleAnswer, handleIce, toggleMic, toggleCam, micEnabled, camEnabled, isVideo } = useCallStore();
  const { socket } = useAuthStore();
  const localRef = useRef(null);
  const remoteRef = useRef(null);

  useEffect(() => {
    if (localRef.current && localStream) localRef.current.srcObject = localStream;
  }, [localStream]);
  useEffect(() => {
    if (remoteRef.current && remoteStream) remoteRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  useEffect(() => {
    const onOffer = ({ senderId, sdp }) => acceptOffer({ senderId, sdp });
    const onAnswer = ({ sdp }) => handleAnswer(sdp);
    const onIce = ({ candidate }) => handleIce(candidate);
    const onEnd = () => endCall();
    socket.on("call:offer", onOffer);
    socket.on("call:answer", onAnswer);
    socket.on("call:ice", onIce);
    socket.on("call:end", onEnd);
    return () => {
      socket.off("call:offer", onOffer);
      socket.off("call:answer", onAnswer);
      socket.off("call:ice", onIce);
      socket.off("call:end", onEnd);
    };
  }, [socket, acceptOffer, handleAnswer, handleIce, endCall]);

  if (!inCall) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 grid place-items-center">
      <div className="w-[800px] h-[500px] bg-slate-900 border border-slate-700 rounded-xl overflow-hidden relative">
        <video ref={remoteRef} autoPlay playsInline className="w-full h-full object-cover" />
        <video ref={localRef} autoPlay playsInline muted className="w-40 h-28 object-cover absolute bottom-4 right-4 rounded-lg border border-white/20" />
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
          <button className={`btn ${micEnabled ? "bg-slate-700" : "bg-slate-500"} text-white`} onClick={toggleMic}>{micEnabled ? "Mute" : "Unmute"}</button>
          {isVideo && (
            <button className={`btn ${camEnabled ? "bg-slate-700" : "bg-slate-500"} text-white`} onClick={toggleCam}>{camEnabled ? "Camera Off" : "Camera On"}</button>
          )}
          <button className="btn bg-red-600 hover:bg-red-700 text-white" onClick={endCall}>End</button>
        </div>
      </div>
    </div>
  );
}

export default CallOverlay;


