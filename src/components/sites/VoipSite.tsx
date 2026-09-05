import { useEffect, useMemo, useState } from "react";
import {
  useDB,
  callsFor,
  logCall,
  userName,
  fmtDur,
  fmtDT,
  phoneDigits,
  toast,
  type User,
} from "../../lib/db";
import {
  IcArrowL,
  IcArrowR,
  IcClock,
  IcHold,
  IcMic,
  IcMicOff,
  IcPhone,
  IcPhoneOff,
  IcSpeaker,
  SiteMark,
} from "../../lib/icons";

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
function beep(freq: number, dur = 0.1, type: OscillatorType = "sine", gain = 0.05) {
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
    /* тишина — не повод для паники */
  }
}

type Phase = "idle" | "dialing" | "ringing" | "active";

export default function VoipSite({ user }: { user: User }) {
  const db = useDB();
  const [dial, setDial] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [target, setTarget] = useState<User | null>(null);
  const [sec, setSec] = useState(0);
  const [muted, setMuted] = useState(false);
  const [held, setHeld] = useState(false);
  const [speaker, setSpeaker] = useState(false);
  const [endedInfo, setEndedInfo] = useState<{ name: string; dur: number } | null>(null);

  const match = useMemo(() => {
    if (dial.length < 4) return null;
    return db.users.find((u) => u.login !== user.login && phoneDigits(u.phone) === dial) ?? null;
  }, [dial, db.users, user.login]);

  useEffect(() => {
    if (phase === "dialing") {
      const t = setTimeout(() => setPhase("ringing"), 1200);
      return () => clearTimeout(t);
    }
    if (phase === "ringing") {
      beep(425, 0.9, "sine", 0.045);
      const iv = setInterval(() => beep(425, 0.9, "sine", 0.045), 2600);
      const t = setTimeout(() => {
        setPhase("active");
        beep(660, 0.1);
        setTimeout(() => beep(880, 0.14), 120);
      }, 2800 + Math.random() * 1200);
      return () => {
        clearInterval(iv);
        clearTimeout(t);
      };
    }
    if (phase === "active") {
      const iv = setInterval(() => setSec((s) => s + 1), 1000);
      return () => clearInterval(iv);
    }
  }, [phase]);

  const startCall = (t: User) => {
    if (t.login === user.login) {
      toast("Абонент занят — вы пытаетесь вызвать сами себя", "err");
      beep(300, 0.25, "square", 0.04);
      return;
    }
    setTarget(t);
    setSec(0);
    setMuted(false);
    setHeld(false);
    setSpeaker(false);
    setPhase("dialing");
    beep(520, 0.08);
  };

  const endCall = () => {
    if (target) {
      logCall(user.login, target.login, sec);
      setEndedInfo({ name: target.name, dur: sec });
      toast(`Разговор завершён (${fmtDur(sec)}) — записано в журнал`, "info");
    }
    setPhase("idle");
    setTarget(null);
    setDial("");
    beep(340, 0.18, "sine", 0.04);
    setTimeout(() => setEndedInfo(null), 2800);
  };

  const press = (k: string) => {
    if (k === "⌫") {
      setDial((d) => d.slice(0, -1));
      beep(380, 0.05);
      return;
    }
    if (/^\d$/.test(k)) {
      setDial((d) => (d.length >= 4 ? d : d + k));
      beep(620 + Number(k) * 32, 0.07);
    } else {
      beep(500, 0.07);
    }
  };

  const contacts = db.users.filter((u) => u.login !== user.login);
  const history = callsFor(user.login).slice(0, 8);
  const statusText =
    phase === "dialing" ? "СОЕДИНЕНИЕ…" : phase === "ringing" ? "ВЫЗОВ АБОНЕНТА…" : "НА ЛИНИИ";

  return (
    <div className="mx-auto flex h-full max-w-6xl gap-5 overflow-y-auto p-5 lg:overflow-hidden">
      {/* контакты и журнал */}
      <div className="hidden w-72 shrink-0 flex-col gap-4 overflow-y-auto md:flex">
        <div className="panel p-4">
          <h3 className="mono text-[10px] tracking-[0.25em] text-[var(--dim)]">АБОНЕНТЫ СЕТИ</h3>
          <div className="mt-2">
            {contacts.map((u) => (
              <button
                key={u.login}
                onClick={() => startCall(u)}
                className="group flex w-full items-center gap-3 px-2 py-2 text-left transition-colors hover:bg-[rgba(79,156,134,.07)]"
              >
                <SiteMark label={u.name[0]} hue="var(--verd)" size={30} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-[var(--txt)] transition-colors group-hover:text-[var(--verd2)]">
                    {u.name}
                  </div>
                  <div className="mono text-[11px] text-[var(--dim)]">А-{u.phone}</div>
                </div>
                <span className="dot-live h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--verd)]" />
              </button>
            ))}
          </div>
        </div>

        <div className="panel flex-1 p-4">
          <h3 className="mono flex items-center gap-2 text-[10px] tracking-[0.25em] text-[var(--dim)]">
            <IcClock size={13} /> ЖУРНАЛ ВЫЗОВОВ
          </h3>
          <div className="mt-2">
            {history.length === 0 && (
              <p className="mono text-[11px] text-[var(--dim)]">Вызовов ещё не было.</p>
            )}
            {history.map((c) => {
              const out = c.from === user.login;
              return (
                <div key={c.id} className="flex items-center gap-2 border-b border-[var(--line)] py-2 last:border-0">
                  <span className={out ? "text-[var(--brass)]" : "text-[var(--verd)]"}>
                    {out ? <IcArrowR size={14} /> : <IcArrowL size={14} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] text-[var(--txt)]">{userName(out ? c.to : c.from)}</div>
                    <div className="mono text-[10px] text-[var(--dim)]">{fmtDT(c.ts)}</div>
                  </div>
                  <span className="mono text-[11px] text-[var(--txt2)]">{fmtDur(c.duration)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* аппарат */}
      <div className="flex min-w-0 flex-1 flex-col items-center">
        <div className="panel w-full max-w-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="display text-2xl tracking-wide">АРГО<span className="text-[var(--verd)]">ФОН</span></h2>
              <p className="mono mt-0.5 text-[10px] tracking-[0.2em] text-[var(--dim)]">
                ГОЛОСОВАЯ СЛУЖБА • ZVONOK.ANCT
              </p>
            </div>
            <div className="mono text-right text-[11px] text-[var(--txt2)]">
              ВАШ НОМЕР
              <div className="display text-base text-[var(--verd2)]">А-{user.phone}</div>
            </div>
          </div>

          {phase === "idle" && (
            <>
              <div className="mono mt-6 border border-[var(--line)] bg-[rgba(10,17,14,.85)] px-4 py-3 text-center">
                <div className="h-8 text-2xl tracking-[0.3em] text-[var(--txt)]">
                  {dial ? (dial.length === 4 ? `${dial.slice(0, 2)}-${dial.slice(2)}` : dial) : (
                    <span className="text-[var(--dim)]">····</span>
                  )}
                </div>
                <div className="mt-1 h-4 text-[11px]">
                  {match ? (
                    <span className="text-[var(--verd2)]">{match.name}</span>
                  ) : dial.length >= 4 ? (
                    <span className="text-[var(--signal2)]">абонент не найден</span>
                  ) : (
                    <span className="text-[var(--dim)]">внутренний номер, 4 знака</span>
                  )}
                </div>
              </div>

              <div className="mx-auto mt-5 grid w-60 grid-cols-3 gap-2">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "⌫"].map((k) => (
                  <button
                    key={k}
                    onClick={() => press(k)}
                    className="display h-13 border border-[var(--line)] bg-[rgba(23,38,31,.5)] py-3 text-lg text-[var(--txt)] transition-all hover:border-[var(--verd)] hover:text-[var(--verd2)] active:scale-95"
                  >
                    {k}
                  </button>
                ))}
              </div>

              <button
                onClick={() => match && startCall(match)}
                disabled={!match}
                className="btn btn-verd mt-5 w-full py-3.5"
              >
                <IcPhone size={16} /> Вызов {match ? `А-${match.phone}` : ""}
              </button>
            </>
          )}

          {phase !== "idle" && target && (
            <div className="siteIn mt-6 flex flex-col items-center">
              <div className="relative h-28 w-28">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{ border: "1px solid var(--verd)", animation: "ringPulse 1.9s ease-out infinite" }}
                />
                <div
                  className="absolute inset-0 rounded-full"
                  style={{ border: "1px solid var(--verd)", animation: "ringPulse 1.9s ease-out infinite", animationDelay: "0.6s" }}
                />
                <div className="absolute inset-0 flex items-center justify-center rounded-full border border-[var(--line2)] bg-[rgba(10,17,14,.9)]">
                  <SiteMark label={target.name[0]} hue="var(--verd)" size={64} />
                </div>
              </div>

              <div className="display mt-4 text-lg tracking-wide">{target.name}</div>
              <div className="mono text-[11px] text-[var(--dim)]">А-{target.phone} • шифр АРГ-256</div>

              <div className={`mono mt-3 text-[12px] tracking-[0.3em] ${phase === "active" ? "text-[var(--verd2)]" : "text-[var(--brass2)] blink"}`}>
                {statusText}
                {held && phase === "active" && <span className="text-[var(--brass2)]"> • УДЕРЖАНИЕ</span>}
              </div>

              <div className="display mt-2 text-4xl tracking-[0.15em] text-[var(--txt)]">
                {phase === "active" ? fmtDur(sec) : "--:--"}
              </div>

              <div className={`eq mt-4 flex items-end gap-1.5 ${held || muted ? "held" : ""}`} style={{ height: 30 }}>
                {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                  <span key={i} style={{ animationDelay: `${i * 0.12}s`, background: muted ? "var(--signal)" : "var(--verd)" }} />
                ))}
              </div>

              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  onClick={() => {
                    setMuted((m) => !m);
                    beep(muted ? 600 : 300, 0.07);
                  }}
                  title="Заглушить микрофон"
                  className={`flex h-12 w-12 items-center justify-center border transition-all ${
                    muted
                      ? "border-[var(--signal)] bg-[rgba(198,90,69,.15)] text-[var(--signal2)]"
                      : "border-[var(--line2)] text-[var(--txt2)] hover:border-[var(--verd)] hover:text-[var(--verd2)]"
                  }`}
                >
                  {muted ? <IcMicOff size={18} /> : <IcMic size={18} />}
                </button>
                <button
                  onClick={() => {
                    setHeld((h) => !h);
                    beep(held ? 600 : 300, 0.07);
                  }}
                  title="Удержание"
                  className={`flex h-12 w-12 items-center justify-center border transition-all ${
                    held
                      ? "border-[var(--brass)] bg-[rgba(201,163,92,.15)] text-[var(--brass2)]"
                      : "border-[var(--line2)] text-[var(--txt2)] hover:border-[var(--verd)] hover:text-[var(--verd2)]"
                  }`}
                >
                  <IcHold size={18} />
                </button>
                <button
                  onClick={() => {
                    setSpeaker((s) => !s);
                    beep(speaker ? 300 : 600, 0.07);
                  }}
                  title="Громкая связь"
                  className={`flex h-12 w-12 items-center justify-center border transition-all ${
                    speaker
                      ? "border-[var(--verd)] bg-[rgba(79,156,134,.15)] text-[var(--verd2)]"
                      : "border-[var(--line2)] text-[var(--txt2)] hover:border-[var(--verd)] hover:text-[var(--verd2)]"
                  }`}
                >
                  <IcSpeaker size={18} />
                </button>
              </div>

              <button onClick={endCall} className="btn btn-danger mt-6 w-full py-3.5">
                <IcPhoneOff size={16} /> Завершить разговор
              </button>
            </div>
          )}
        </div>

        <p className="mono mt-3 max-w-md text-center text-[10px] leading-5 tracking-[0.12em] text-[var(--dim)]">
          ПРОТОТИП ИМИТИРУЕТ СОЕДИНЕНИЕ. В БОЕВОМ КОНТУРЕ — WEBRTC МЕЖДУ БРАУЗЕРАМИ, СИГНАЛИЗАЦИЯ ЧЕРЕЗ
          Flask-УЗЕЛ.
        </p>
      </div>

      {endedInfo && (
        <div className="pointer-events-none fixed inset-x-0 top-24 z-40 flex justify-center">
          <div className="panel fadeUp mono border-[var(--verd)] px-6 py-3 text-[12px] tracking-[0.15em] text-[var(--verd2)]">
            РАЗГОВОР С «{endedInfo.name.toUpperCase()}» ЗАВЕРШЁН • {fmtDur(endedInfo.dur)}
          </div>
        </div>
      )}
    </div>
  );
}
