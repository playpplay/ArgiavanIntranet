/* ============================================================
   ГИКС • сигналинг и присутствие.
   Прототип: BroadcastChannel между вкладками одного браузера
   (каждая вкладка входит под своим IŦirinio — сессия на вкладку).
   Боевой контур: те же сообщения идут через WebSocket/поллинг
   Django-узла, медиа — по-прежнему WebRTC P2P.
   ============================================================ */

export interface PeerInfo {
  login: string;
  name: string;
  giks: string;
  ts: number;
}

export type Signal =
  | { type: "presence"; peer: PeerInfo }
  | { type: "bye"; login: string }
  | { type: "offer"; from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { type: "answer"; from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { type: "ice"; from: string; to: string; cand: RTCIceCandidateInit | null }
  | { type: "decline"; from: string; to: string }
  | { type: "busy"; from: string; to: string }
  | { type: "hangup"; from: string; to: string };

const CHANNEL = "argnet-giks-signal-v1";
let ch: BroadcastChannel | null = null;

function getCh(): BroadcastChannel | null {
  try {
    if (!ch) ch = new BroadcastChannel(CHANNEL);
    return ch;
  } catch {
    return null;
  }
}

export function postSignal(m: Signal) {
  try {
    getCh()?.postMessage(m);
  } catch {
    /* канал недоступен — работаем локально */
  }
}

export function onSignal(fn: (m: Signal) => void): () => void {
  const c = getCh();
  if (!c) return () => {};
  const h = (ev: MessageEvent) => {
    const d = ev.data as Signal;
    if (d && typeof d === "object" && "type" in d) fn(d);
  };
  c.addEventListener("message", h);
  return () => c.removeEventListener("message", h);
}

/** Аудиопоток: микрофон, при отказе — тихий синтетический носитель, чтобы тракт работал. */
export async function getAudioStream(): Promise<MediaStream> {
  try {
    if (navigator.mediaDevices?.getUserMedia) {
      return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    }
  } catch {
    /* доступ к микрофону не дан — используем носитель */
  }
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  const dst = ctx.createMediaStreamDestination();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  gain.gain.value = 0;
  osc.connect(gain);
  gain.connect(dst);
  osc.start();
  return dst.stream;
}

export function newPeerConnection(): RTCPeerConnection {
  return new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });
}

/* ---------- тональность ---------- */

let actx: AudioContext | null = null;
function ac(): AudioContext | null {
  try {
    if (!actx) actx = new AudioContext();
    if (actx.state === "suspended") void actx.resume();
    return actx;
  } catch {
    return null;
  }
}
export function beep(freq: number, dur = 0.1, type: OscillatorType = "sine", gain = 0.05) {
  const c = ac();
  if (!c) return;
  try {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(gain, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + dur);
  } catch {
    /* тишина */
  }
}
export function ringPattern() {
  beep(440, 0.35, "sine", 0.06);
  window.setTimeout(() => beep(480, 0.35, "sine", 0.06), 400);
}
