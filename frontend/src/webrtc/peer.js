export function createPeer({ onTrack, onIceCandidate } = {}) {
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
    ],
  });
  if (onTrack) pc.ontrack = (e) => onTrack(e.streams[0]);
  if (onIceCandidate) pc.onicecandidate = (e) => {
    if (e.candidate) onIceCandidate(e.candidate);
  };
  return pc;
}


