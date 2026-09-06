import { useEffect, useMemo, useRef, useState } from "react";
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
    /* тишина */
  }
}
function ringtone() {
  beep(440, 0.35, "sine", 0.06);
  setTimeout(() => beep(480, 0.35, "sine", 0.06), 400);
}

type Phase = "idle" | "dialing" | "ringing" | "active";

export default function GiksSite({ user }: { user: User }) {
  const db = useDB();
  const [dial, setDial] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [target, setTarget] = useState<User | null>(null);
  const [sec, setSec] = useState(0);
  const [muted, setMuted] = useState(false);
  const [held, setHeld] = useState(false);
  const [speaker, setSpeaker] = useState(false);
  const [incoming, setIncoming] = useState<User | null>(null);
  const mounted = useRef(true);
  const incTimer = useRef<number | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (incTimer.current) window.clearTimeout(incTimer.current);
    };
  }, []);

  /* имитация входящего вызова от другого абонента сети */
  const scheduleIncoming = (delay: number) => {
    if (incTimer.current) window.clearTimeout(incTimer.current);
    incTimer.current = window.setTimeout(() => {
      if (!mounted.current) return;
      const others = db.users.filter((u) => u.login !== user.login && !u.blocked);
      if (!others.length) return;
      const caller = others[Math.floor(Math.random() * others.length)];
      setIncoming(caller);
      ringtone();
      const iv = window.setInterval(() => mounted.current && ringtone(), 2400);
      const cancel = window.setTimeout(() => {
        window.clearInterval(iv);
        setIncoming((cur) => {
          if (cur) logCall(cur.login, user.login, 0, "missed");
          return null;
        });
        scheduleIncoming(35000 + Math.random() * 25000);
      }, 18000);
      // храним интервал для очистки при принятии/отклонении
      (scheduleIncoming as unknown as { _iv?: number })._iv = iv;
      (scheduleIncoming as unknown as { _cancel?: number })._cancel = cancel;
    }, delay);
  };

  useEffect(() => {
    scheduleIncoming(22000 + Math.random() * 14000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearIncomingTimers = () => {
    const f = scheduleIncoming as unknown as { _iv?: number; _cancel?: number };
    if (f._iv) window.clearInterval(f._iv);
    if (f._cancel) window.clearTimeout(f._cancel);
  };

  const match = useMemo(() => {
    if (dial.length < 3) return null;
    return db.users.find((u) => u.login !== user.login && phoneDigits(u.giks) === dial) ?? null;
  }, [dial, db.users, user.login]);

  useEffect(() => {
    if (phase === "dialing") {
      const t = setTimeout(() => setPhase("ringing"), 1100);
      return () => clearTimeout(t);
    }
    if (phase === "ringing") {
      beep(425, 0.9, "sine", 0.045);
      const iv = setInterval(() => beep(425, 0.9, "sine", 0.045), 2600);
      const t = setTimeout(() => {
        setPhase("active");
        beep(660, 0.1);
        setTimeout(() => beep(880, 0.14), 120);
      }, 2600 + Math.random() * 1300);
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
    if (t.login === user.login) return;
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
      toast(`Разговор завершён (${fmtDur(sec)}). Запись передана в архив ГИКС (КГТ)`, "info");
    }
    setPhase("idle");
    setTarget(null);
    setDial("");
    beep(340, 0.18, "sine", 0.04);
  };

  const acceptIncoming = () => {
    if (!incoming) return;
    clearIncomingTimers();
    setIncoming(null);
    setTarget(incoming);
    setSec(0);
    setPhase("active");
    beep(660, 0.1);
    setTimeout(() => beep(880, 0.14), 120);
  };
  const declineIncoming = () => {
    if (!incoming) return;
    clearIncomingTimers();
    logCall(incoming.login, user.login, 0, "declined");
    setIncoming(null);
    toast("Вызов отклонён", "info");
    beep(300, 0.2, "square", 0.04);
    scheduleIncoming(40000 + Math.random() * 25000);
  };

  const press = (k: string) => {
    if (k === "⌫") {
      setDial((d) => d.slice(0, -1));
      beep(380, 0.05);
      return;
    }
    if (/^\d$/.test(k)) {
      setDial((d) => (d.length >= 9 ? d : d + k));
      beep(620 + Number(k) * 32, 0.07);
    } else {
      beep(500, 0.07);
    }
  };

  const contacts = db.users.filter((u) => u.login !== user.login && !u.blocked);
  const history = callsFor(user.login).slice(0, 8);
  const statusText = phase === "dialing" ? "СОЕДИНЕНИЕ…" : phase === "ringing" ? "ВЫЗОВ АБОНЕНТА…" : "НА ЛИНИИ";
  const formatted = dial ? dial.replace(/(\d{2})(\d{1,2})?/, (_, a: string, b?: string) => `${a}${b ? "-" + b : ""}`) : "";

  return (
    <div className="mx-auto flex h-full max-w-6xl gap-5 overflow-y-auto p-5 lg:overflow-hidden">
      {/* абоненты и журнал */}
      <div className="hidden w-72 shrink-0 flex-col gap-4 overflow-y-auto md:flex">
        <div className="panel p-4">
          <h3 className="mono text-[10px] tracking-[0.25em] text-[var(--dim)]">АБОНЕНТЫ ГИКС</h3>
          <div className="mt-2">
            {contacts.map((u) => (
              <button key={u.login} onClick={() => startCall(u)} className="group flex w-full items-center gap-3 px-2 py-2 text-left transition-colors hover:bg-[rgba(212,175,55,.05)]">
                <SiteMark label={u.name[0]} hue="var(--gold)" size={30} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-semibold text-[var(--txt)] transition-colors group-hover:text-[var(--gold2)]">
                    {u.name}
                  </div>
                  <div className="mono text-[11px] text-[var(--dim)]">ГиКС {u.giks}</div>
                </div>
                <span className="dot-live h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--gold)]" />
              </button>
            ))}
          </div>
        </div>

        <div className="panel flex-1 p-4">
          <h3 className="mono flex items-center gap-2 text-[10px] tracking-[0.25em] text-[var(--dim)]">
            <IcClock size={13} /> ЖУРНАЛ ВЫЗОВОВ
          </h3>
          <div className="mt-2">
            {history.length === 0 && <p className="mono text-[11px] text-[var(--dim)]">Вызовов ещё не было.</p>}
            {history.map((c) => {
              const out = c.from === user.login;
              return (
                <div key={c.id} className="flex items-center gap-2 border-b border-[var(--line)] py-2 last:border-0">
                  <span className={c.status !== "ok" ? "text-[var(--red3)]" : out ? "text-[var(--gold)]" : "text-[var(--txt2)]"}>
                    {out ? <IcArrowR size={14} /> : <IcArrowL size={14} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] text-[var(--txt)]">{userName(out ? c.to : c.from)}</div>
                    <div className="mono text-[9.5px] text-[var(--dim)]">
                      {fmtDT(c.ts)}
                      {c.status === "missed" && " • пропущен"}
                      {c.status === "declined" && " • отклонён"}
                    </div>
                  </div>
                  <span className="mono text-[11px] text-[var(--txt2)]">{c.status === "ok" ? fmtDur(c.duration) : "—"}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* коммутатор */}
      <div className="flex min-w-0 flex-1 flex-col items-center overflow-y-auto">
        <div className="panel w-full max-w-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="display text-2xl font-extrabold tracking-wide">
                ГИКС<span className="text-[var(--red3)]">•</span>ТЕЛЕФОНИЯ
              </h2>
              <p className="mono mt-0.5 text-[10px] tracking-[0.2em] text-[var(--dim)]">CALL.ARG • ПОРТ 8004 • WEBRTC</p>
            </div>
            <div className="mono text-right text-[10px] text-[var(--txt2)]">
              ВАШ НОМЕР
              <div className="display text-base text-[var(--gold2)]">{user.giks}</div>
            </div>
          </div>

          {phase === "idle" && (
            <>
              <div className="mono mt-6 border border-[var(--line)] bg-[#0a0a0a] px-4 py-3 text-center">
                <div className="h-8 text-2xl tracking-[0.2em] text-[var(--txt)]">
                  {dial || <span className="text-[var(--dim)]">–––</span>}
                </div>
                <div className="mt-1 h-4 text-[11px]">
                  {match ? (
                    <span className="text-[var(--gold2)]">{match.name} • {match.giks}</span>
                  ) : dial.length >= 3 ? (
                    <span className="text-[var(--red3)]">абонент не числится в реестре ГИКС</span>
                  ) : (
                    <span className="text-[var(--dim)]">наберите номер по Табели Kogoręx</span>
                  )}
                </div>
              </div>

              <div className="mx-auto mt-5 grid w-64 grid-cols-3 gap-2">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "⌫"].map((k) => (
                  <button
                    key={k}
                    onClick={() => press(k)}
                    className="display border border-[var(--line)] bg-[rgba(26,26,26,.55)] py-3 text-lg text-[var(--txt)] transition-all hover:border-[var(--gold)] hover:text-[var(--gold2)] active:scale-95"
                  >
                    {k}
                  </button>
                ))}
              </div>

              <button onClick={() => match && startCall(match)} disabled={!match} className="btn btn-gold mt-5 w-full py-3.5">
                <IcPhone size={16} /> Установить связь
              </button>
            </>
          )}

          {phase !== "idle" && target && (
            <div className="siteIn mt-6 flex flex-col items-center">
              <div className="relative h-28 w-28">
                <div className="absolute inset-0 rounded-full" style={{ border: "1px solid var(--gold)", animation: "ringPulse 1.9s ease-out infinite" }} />
                <div className="absolute inset-0 rounded-full" style={{ border: "1px solid var(--gold)", animation: "ringPulse 1.9s ease-out infinite", animationDelay: "0.6s" }} />
                <div className="absolute inset-0 flex items-center justify-center rounded-full border border-[var(--line2)] bg-[#0a0a0a]">
                  <SiteMark label={target.name[0]} hue="var(--gold)" size={64} />
                </div>
              </div>

              <div className="display mt-4 text-lg font-bold">{target.name}</div>
              <div className="mono text-[11px] text-[var(--dim)]">ГиКС {target.giks} • Iŧirinio {target.itirinio}</div>

              <div className={`mono mt-3 text-[12px] tracking-[0.3em] ${phase === "active" ? "text-[var(--gold2)]" : "blink text-[var(--red3)]"}`}>
                {statusText}
                {held && phase === "active" && <span className="text-[var(--gold2)]"> • УДЕРЖАНИЕ</span>}
              </div>

              <div className="display mt-2 text-4xl tracking-[0.15em] text-[var(--txt)]">{phase === "active" ? fmtDur(sec) : "--:--"}</div>

              <div className={`eq mt-4 flex items-end gap-1.5 ${held || muted ? "held" : ""}`} style={{ height: 30 }}>
                {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                  <span key={i} style={{ animationDelay: `${i * 0.12}s`, background: muted ? "var(--red2)" : "var(--gold)" }} />
                ))}
              </div>

              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  onClick={() => { setMuted((m) => !m); beep(muted ? 600 : 300, 0.07); }}
                  title="Заглушить микрофон"
                  className={`flex h-12 w-12 items-center justify-center border transition-all ${muted ? "border-[var(--red2)] bg-[rgba(139,0,0,.2)] text-[var(--red3)]" : "border-[var(--line2)] text-[var(--txt2)] hover:border-[var(--gold)] hover:text-[var(--gold2)]"}`}
                >
                  {muted ? <IcMicOff size={18} /> : <IcMic size={18} />}
                </button>
                <button
                  onClick={() => { setHeld((h) => !h); beep(held ? 600 : 300, 0.07); }}
                  title="Удержание"
                  className={`flex h-12 w-12 items-center justify-center border transition-all ${held ? "border-[var(--gold)] bg-[rgba(212,175,55,.12)] text-[var(--gold2)]" : "border-[var(--line2)] text-[var(--txt2)] hover:border-[var(--gold)] hover:text-[var(--gold2)]"}`}
                >
                  <IcHold size={18} />
                </button>
                <button
                  onClick={() => { setSpeaker((s) => !s); beep(speaker ? 300 : 600, 0.07); }}
                  title="Громкая связь"
                  className={`flex h-12 w-12 items-center justify-center border transition-all ${speaker ? "border-[var(--gold)] bg-[rgba(212,175,55,.12)] text-[var(--gold2)]" : "border-[var(--line2)] text-[var(--txt2)] hover:border-[var(--gold)] hover:text-[var(--gold2)]"}`}
                >
                  <IcSpeaker size={18} />
                </button>
              </div>

              <button onClick={endCall} className="btn btn-red mt-6 w-full py-3.5">
                <IcPhoneOff size={16} /> Разъединить
              </button>
            </div>
          )}
        </div>

        <p className="mono mt-3 max-w-md text-center text-[10px] leading-5 tracking-[0.12em] text-[var(--dim)]">
          ВНИМАНИЕ: ВСЕ ГОЛОСОВЫЕ КОММУНИКАЦИИ В СЕТИ ГИКС ПОДЛЕЖАТ АРХИВАЦИИ В СООТВЕТСТВИИ С КГТ. ПРОТОТИП
          ИМИТИРУЕТ СОЕДИНЕНИЕ; В БОЕВОМ КОНТУРЕ — WEBRTC.
        </p>
      </div>

      {/* входящий вызов (ТЗ п.6) */}
      {incoming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="panel siteIn w-full max-w-md border-[rgba(212,175,55,.5)] p-6 text-center">
            <p className="mono text-[10px] tracking-[0.3em] text-[var(--red3)] blink">ВХОДЯЩИЙ ВЫЗОВ ГИКС</p>
            <div className="mt-5 flex justify-center">
              <div className="relative h-20 w-20">
                <div className="ring-in absolute inset-0 rounded-full border border-[var(--gold)]" />
                <div className="ring-in absolute inset-0 rounded-full border border-[var(--gold)]" style={{ animationDelay: "0.5s" }} />
                <div className="absolute inset-0 flex items-center justify-center rounded-full border border-[var(--line2)] bg-[#0a0a0a]">
                  <SiteMark label={incoming.name[0]} hue="var(--gold)" size={46} />
                </div>
              </div>
            </div>
            <p className="mt-4 text-[13.5px] text-[var(--txt)]">
              Входящий вызов от: <span className="font-bold text-[var(--gold2)]">{incoming.name}</span>
            </p>
            <p className="mono mt-1 text-[12px] text-[var(--txt2)]">Номер: {incoming.giks}</p>
            <div className="mt-6 flex gap-3">
              <button onClick={acceptIncoming} className="btn btn-gold flex-1 py-3.5">
                <IcPhone size={15} /> Принять
              </button>
              <button onClick={declineIncoming} className="btn btn-red flex-1 py-3.5">
                <IcPhoneOff size={15} /> Отклонить
              </button>
            </div>
            <p className="mono mt-4 text-[9.5px] leading-4 tracking-[0.14em] text-[var(--dim)]">
              ВНИМАНИЕ: ВСЕ ГОЛОСОВЫЕ КОММУНИКАЦИИ В СЕТИ ГИКС ПОДЛЕЖАТ АРХИВАЦИИ В СООТВЕТСТВИИ С КГТ.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
