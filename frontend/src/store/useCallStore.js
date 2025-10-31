import { create } from "zustand";
import { useAuthStore } from "./useAuthStore";
import { createPeer } from "../webrtc/peer";

export const useCallStore = create((set, get) => ({
  inCall: false,
  isVideo: false,
  localStream: null,
  remoteStream: null,
  peer: null,
  targetUserId: null,
  micEnabled: true,
  camEnabled: true,

  startCall: async ({ targetUserId, video }) => {
    const socket = useAuthStore.getState().socket;
    const constraints = { audio: true, video: !!video };
    const local = await navigator.mediaDevices.getUserMedia(constraints);
    const peer = createPeer({
      onTrack: (stream) => set({ remoteStream: stream }),
      onIceCandidate: (candidate) => socket.emit("call:ice", { receiverId: targetUserId, candidate }),
    });
    local.getTracks().forEach((t) => peer.addTrack(t, local));
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    socket.emit("call:offer", { receiverId: targetUserId, sdp: offer, kind: video ? "video" : "audio" });
    set({ inCall: true, isVideo: !!video, localStream: local, peer, targetUserId });
  },

  acceptOffer: async ({ senderId, sdp }) => {
    const socket = useAuthStore.getState().socket;
    const video = sdp?.sdp?.includes("m=video");
    const constraints = { audio: true, video };
    const local = await navigator.mediaDevices.getUserMedia(constraints);
    const peer = createPeer({
      onTrack: (stream) => set({ remoteStream: stream }),
      onIceCandidate: (candidate) => socket.emit("call:ice", { receiverId: senderId, candidate }),
    });
    local.getTracks().forEach((t) => peer.addTrack(t, local));
    await peer.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    socket.emit("call:answer", { receiverId: senderId, sdp: answer });
    set({ inCall: true, isVideo: video, localStream: local, peer, targetUserId: senderId });
  },

  handleAnswer: async (sdp) => {
    const { peer } = get();
    if (peer) await peer.setRemoteDescription(new RTCSessionDescription(sdp));
  },

  handleIce: async (candidate) => {
    const { peer } = get();
    if (peer) await peer.addIceCandidate(new RTCIceCandidate(candidate));
  },

  endCall: () => {
    const { peer, localStream, targetUserId } = get();
    const socket = useAuthStore.getState().socket;
    if (peer) peer.close();
    localStream?.getTracks().forEach((t) => t.stop());
    if (socket && targetUserId) socket.emit("call:end", { receiverId: targetUserId });
    set({ inCall: false, isVideo: false, localStream: null, remoteStream: null, peer: null, targetUserId: null });
  },

  toggleMic: () => {
    const { localStream, micEnabled } = get();
    localStream?.getAudioTracks().forEach((t) => (t.enabled = !micEnabled));
    set({ micEnabled: !micEnabled });
  },

  toggleCam: () => {
    const { localStream, camEnabled } = get();
    localStream?.getVideoTracks().forEach((t) => (t.enabled = !camEnabled));
    set({ camEnabled: !camEnabled });
  },
}));


