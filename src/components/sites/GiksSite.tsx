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
import { beep, getAudioStream, newPeerConnection, onSignal, postSignal, ringPattern, type PeerInfo, type Signal } from "../../lib/callnet";
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

type Phase = "idle" | "calling" | "incoming" | "active";

export default function GiksSite({ user }: { user: User }) {
  const db = useDB();
  const [dial, setDial] = useState("");
  const [phase, setPhaseState] = useState<Phase>("idle");
  const [peer, setPeerState] = useState<User | null>(null);
  const [sec, setSec] = useState(0);
  const [muted, setMuted] = useState(false);
  const [held, setHeld] = useState(false);
  const [speaker, setSpeaker] = useState(false);
  const [online, setOnline] = useState<Record<string, PeerInfo>>({});

  const phaseRef = useRef<Phase>("idle");
  const peerRef = useRef<User | null>(null);
  const secRef = useRef(0);
  const callerRef = useRef<string | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const ringIvRef = useRef<number | null>(null);
  const secIvRef = useRef<number | null>(null);
  const callToRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mountedRef = useRef(true);

  const setPhase = (p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  };
  const setPeer = (u: User | null) => {
    peerRef.current = u;
    setPeerState(u);
  };

  /* ---------- присутствие и сигналинг ---------- */

  useEffect(() => {
    mountedRef.current = true;
    const me: PeerInfo = { login: user.login, name: user.name, giks: user.giks, ts: Date.now() };
    const beat = () => postSignal({ type: "presence", peer: { ...me, ts: Date.now() } });
    beat();
    const beatIv = window.setInterval(beat, 2000);
    const pruneIv = window.setInterval(() => {
      setOnline((o) => {
        const now = Date.now();
        const next: Record<string, PeerInfo> = {};
        for (const k in o) if (now - o[k].ts < 6500) next[k] = o[k];
        return Object.keys(next).length === Object.keys(o).length ? o : next;
      });
    }, 2000);

    const off = onSignal((m: Signal) => {
      if (!mountedRef.current) return;
      switch (m.type) {
        case "presence":
          if (m.peer.login !== user.login)
            setOnline((o) => ({ ...o, [m.peer.login]: m.peer }));
          break;
        case "bye":
          setOnline((o) => {
            const n = { ...o };
            delete n[m.login];
            return n;
          });
          if (peerRef.current?.login === m.login) teardown(true);
          break;
        case "offer":
          if (m.to !== user.login) break;
          if (phaseRef.current !== "idle") {
            postSignal({ type: "busy", from: user.login, to: m.from });
            break;
          }
          pendingOfferRef.current = m.sdp;
          callerRef.current = m.from;
          setPeer({ login: m.from, name: userName(m.from), giks: "", itirinio: "", password: "", role: "citizen", pref: "00", blocked: false, createdAt: 0 });
          setPhase("incoming");
          startRing();
          break;
        case "answer":
          if (m.to !== user.login || phaseRef.current !== "calling") break;
          void (async () => {
            try {
              await pcRef.current?.setRemoteDescription(m.sdp);
            } catch { /* обрыв */ }
          })();
          break;
        case "ice":
          if (m.to !== user.login || !m.cand) break;
          if (pcRef.current && pcRef.current.signalingState !== "closed")
            pcRef.current.addIceCandidate(m.cand).catch(() => {});
          break;
        case "decline":
          if (m.to !== user.login || phaseRef.current !== "calling") break;
          stopRing();
          teardown(false);
          logCall(user.login, m.from, 0, "declined");
          toast("Абонент отклонил вызов", "info");
          break;
        case "busy":
          if (m.to !== user.login || phaseRef.current !== "calling") break;
          stopRing();
          teardown(false);
          toast("Абонент занят", "err");
          break;
        case "hangup":
          if (m.to !== user.login) break;
          if (phaseRef.current === "incoming") {
            stopRing();
            setPhase("idle");
            setPeer(null);
            pendingOfferRef.current = null;
            toast("Абонент отменил вызов", "info");
          } else teardown(true);
          break;
      }
    });

    return () => {
      mountedRef.current = false;
      postSignal({ type: "bye", login: user.login });
      window.clearInterval(beatIv);
      window.clearInterval(pruneIv);
      off();
      stopRing();
      teardown(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.login]);

  /* ---------- мелодия ---------- */

  const startRing = () => {
    stopRing();
    ringPattern();
    ringIvRef.current = window.setInterval(ringPattern, 2400);
  };
  const stopRing = () => {
    if (ringIvRef.current) {
      window.clearInterval(ringIvRef.current);
      ringIvRef.current = null;
    }
  };

  /* ---------- разбор соединения ---------- */

  function teardown(logIt: boolean) {
    stopRing();
    if (secIvRef.current) {
      window.clearInterval(secIvRef.current);
      secIvRef.current = null;
    }
    if (callToRef.current) {
      window.clearTimeout(callToRef.current);
      callToRef.current = null;
    }
    const wasActive = phaseRef.current === "active";
    const dur = secRef.current;
    const p = peerRef.current;
    const iAmCaller = callerRef.current === user.login;
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch { /* уже закрыто */ }
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (audioRef.current) audioRef.current.srcObject = null;
    pendingOfferRef.current = null;
    setMuted(false);
    setHeld(false);
    setSpeaker(false);
    setSec(0);
    secRef.current = 0;
    setPhase("idle");
    setPeer(null);
    callerRef.current = null;
    if (logIt && wasActive && p && iAmCaller && dur > 0) logCall(user.login, p.login, dur, "ok");
  }

  function attachPcHandlers(pc: RTCPeerConnection) {
    pc.onicecandidate = (ev) => {
      if (peerRef.current)
        postSignal({ type: "ice", from: user.login, to: peerRef.current.login, cand: ev.candidate?.toJSON() ?? null });
    };
    pc.ontrack = (ev) => {
      if (audioRef.current) {
        audioRef.current.srcObject = ev.streams[0];
        void audioRef.current.play().catch(() => {});
      }
    };
    pc.oniceconnectionstatechange = () => {
      const st = pc.iceConnectionState;
      if ((st === "connected" || st === "completed") && phaseRef.current !== "active") {
        stopRing();
        if (callToRef.current) {
          window.clearTimeout(callToRef.current);
          callToRef.current = null;
        }
        setPhase("active");
        beep(660, 0.1);
        window.setTimeout(() => beep(880, 0.14), 130);
        secIvRef.current = window.setInterval(() => {
          secRef.current += 1;
          setSec(secRef.current);
        }, 1000);
      }
      if (st === "failed" || st === "disconnected" || st === "closed") {
        if (phaseRef.current === "active" || phaseRef.current === "calling") teardown(true);
      }
    };
  }

  /* ---------- исходящий вызов ---------- */

  const startCall = async (target: User) => {
    if (phaseRef.current !== "idle") return;
    if (!online[target.login]) {
      toast("Абонент не в сети ГИКС", "err");
      beep(300, 0.25, "square", 0.04);
      return;
    }
    setPeer(target);
    callerRef.current = user.login;
    setPhase("calling");
    beep(520, 0.08);
    try {
      const stream = await getAudioStream();
      localStreamRef.current = stream;
      const pc = newPeerConnection();
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      attachPcHandlers(pc);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      postSignal({ type: "offer", from: user.login, to: target.login, sdp: offer });
      callToRef.current = window.setTimeout(() => {
        if (phaseRef.current === "calling") {
          teardown(false);
          logCall(user.login, target.login, 0, "noanswer");
          toast("Абонент не ответил", "info");
        }
      }, 30000);
    } catch {
      teardown(false);
      toast("Не удалось получить доступ к звуковому тракту", "err");
    }
  };

  const acceptCall = async () => {
    if (phaseRef.current !== "incoming" || !pendingOfferRef.current || !peerRef.current) return;
    stopRing();
    try {
      const stream = await getAudioStream();
      localStreamRef.current = stream;
      const pc = newPeerConnection();
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      attachPcHandlers(pc);
      await pc.setRemoteDescription(pendingOfferRef.current);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      postSignal({ type: "answer", from: user.login, to: peerRef.current.login, sdp: answer });
    } catch {
      teardown(false);
      toast("Не удалось принять вызов", "err");
    }
  };

  const declineCall = () => {
    if (phaseRef.current !== "incoming" || !peerRef.current) return;
    stopRing();
    postSignal({ type: "decline", from: user.login, to: peerRef.current.login });
    setPhase("idle");
    setPeer(null);
    pendingOfferRef.current = null;
    beep(300, 0.2, "square", 0.04);
  };

  const hangup = () => {
    if (peerRef.current && phaseRef.current !== "idle")
      postSignal({ type: "hangup", from: user.login, to: peerRef.current.login });
    teardown(true);
    beep(340, 0.18, "sine", 0.04);
  };

  /* ---------- набор ---------- */

  const press = (k: string) => {
    if (k === "⌫") {
      setDial((d) => d.slice(0, -1));
      beep(380, 0.05);
      return;
    }
    if (/^\d$/.test(k)) {
      setDial((d) => (d.length >= 11 ? d : d + k));
      beep(620 + Number(k) * 32, 0.07);
    } else {
      beep(500, 0.07);
    }
  };

  const match = useMemo(() => {
    if (dial.length < 5) return null;
    return db.users.find((u) => u.login !== user.login && !u.blocked && phoneDigits(u.giks) === dial) ?? null;
  }, [dial, db.users, user.login]);

  const contacts = db.users.filter((u) => u.login !== user.login && !u.blocked);
  const history = callsFor(user.login).slice(0, 8);
  const statusText = phase === "calling" ? "ВЫЗОВ АБОНЕНТА…" : "НА ЛИНИИ";

  return (
    <div className="mx-auto flex h-full max-w-6xl gap-5 overflow-y-auto p-5 lg:overflow-hidden">
      <audio ref={audioRef} autoPlay className="hidden" />

      {/* абоненты и журнал */}
      <div className="hidden w-72 shrink-0 flex-col gap-4 overflow-y-auto md:flex">
        <div className="panel p-4">
          <h3 className="mono text-[10px] tracking-[0.25em] text-[var(--dim)]">АБОНЕНТЫ ГИКС</h3>
          <div className="mt-2">
            {contacts.map((u) => {
              const on = !!online[u.login];
              return (
                <button
                  key={u.login}
                  onClick={() => startCall(u)}
                  className="group flex w-full items-center gap-3 px-2 py-2 text-left transition-colors hover:bg-[rgba(212,175,55,.05)]"
                >
                  <SiteMark label={u.name[0]} hue={on ? "var(--gold)" : "var(--line2)"} size={30} />
                  <div className="min-w-0 flex-1">
                    <div className={`truncate text-[12.5px] font-semibold transition-colors ${on ? "text-[var(--txt)] group-hover:text-[var(--gold2)]" : "text-[var(--dim)]"}`}>
                      {u.name}
                    </div>
                    <div className="mono text-[11px] text-[var(--dim)]">ГиКС {u.giks}</div>
                  </div>
                  {on ? (
                    <span className="dot-live h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--gold)]" />
                  ) : (
                    <span className="mono shrink-0 text-[9px] tracking-[0.12em] text-[var(--dim)]">НЕ В СЕТИ</span>
                  )}
                </button>
              );
            })}
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
                      {c.status === "noanswer" && " • без ответа"}
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
              <p className="mono mt-0.5 text-[10px] tracking-[0.2em] text-[var(--dim)]">CALL.ARG : 8004 • WEBRTC</p>
            </div>
            <div className="mono text-right text-[10px] text-[var(--txt2)]">
              ВАШ НОМЕР
              <div className="display text-base text-[var(--gold2)]">{user.giks}</div>
            </div>
          </div>

          {phase === "idle" && (
            <>
              <div className="mono mt-6 border border-[var(--line)] bg-[#0a0a0a] px-4 py-3 text-center">
                <div className="h-8 text-2xl tracking-[0.15em] text-[var(--txt)]">
                  {dial || <span className="text-[var(--dim)]">–––</span>}
                </div>
                <div className="mt-1 h-4 text-[11px]">
                  {match ? (
                    <span className="text-[var(--gold2)]">
                      {match.name} {online[match.login] ? "• в сети" : "• не в сети"}
                    </span>
                  ) : dial.length >= 5 ? (
                    <span className="text-[var(--red3)]">абонент с таким номером не числится</span>
                  ) : (
                    <span className="text-[var(--dim)]">личный номер ГиКС, напр. 17-00-00042-4</span>
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

              <button
                onClick={() => match && void startCall(match)}
                disabled={!match || !online[match?.login ?? ""]}
                className="btn btn-gold mt-5 w-full py-3.5"
              >
                <IcPhone size={16} /> Установить связь
              </button>
            </>
          )}

          {phase !== "idle" && peer && (
            <div className="siteIn mt-6 flex flex-col items-center">
              <div className="relative h-28 w-28">
                <div className="absolute inset-0 rounded-full" style={{ border: "1px solid var(--gold)", animation: "ringPulse 1.9s ease-out infinite" }} />
                <div className="absolute inset-0 rounded-full" style={{ border: "1px solid var(--gold)", animation: "ringPulse 1.9s ease-out infinite", animationDelay: "0.6s" }} />
                <div className="absolute inset-0 flex items-center justify-center rounded-full border border-[var(--line2)] bg-[#0a0a0a]">
                  <SiteMark label={peer.name[0]} hue="var(--gold)" size={64} />
                </div>
              </div>

              <div className="display mt-4 text-lg font-bold">{peer.name}</div>
              <div className="mono text-[11px] text-[var(--dim)]">
                {peer.giks ? `ГиКС ${peer.giks} • ` : ""}IŦirinio подтверждён реестром
              </div>

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
                  onClick={() => {
                    setMuted((m) => {
                      localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = m));
                      return !m;
                    });
                    beep(muted ? 600 : 300, 0.07);
                  }}
                  title="Заглушить микрофон"
                  className={`flex h-12 w-12 items-center justify-center border transition-all ${muted ? "border-[var(--red2)] bg-[rgba(139,0,0,.2)] text-[var(--red3)]" : "border-[var(--line2)] text-[var(--txt2)] hover:border-[var(--gold)] hover:text-[var(--gold2)]"}`}
                >
                  {muted ? <IcMicOff size={18} /> : <IcMic size={18} />}
                </button>
                <button
                  onClick={() => {
                    setHeld((h) => {
                      if (audioRef.current) {
                        if (h) void audioRef.current.play().catch(() => {});
                        else audioRef.current.pause();
                      }
                      return !h;
                    });
                    beep(held ? 600 : 300, 0.07);
                  }}
                  title="Удержание"
                  className={`flex h-12 w-12 items-center justify-center border transition-all ${held ? "border-[var(--gold)] bg-[rgba(212,175,55,.12)] text-[var(--gold2)]" : "border-[var(--line2)] text-[var(--txt2)] hover:border-[var(--gold)] hover:text-[var(--gold2)]"}`}
                >
                  <IcHold size={18} />
                </button>
                <button
                  onClick={() => {
                    setSpeaker((s) => {
                      if (audioRef.current) audioRef.current.volume = s ? 1 : 0.35;
                      return !s;
                    });
                    beep(speaker ? 300 : 600, 0.07);
                  }}
                  title="Громкость"
                  className={`flex h-12 w-12 items-center justify-center border transition-all ${speaker ? "border-[var(--gold)] bg-[rgba(212,175,55,.12)] text-[var(--gold2)]" : "border-[var(--line2)] text-[var(--txt2)] hover:border-[var(--gold)] hover:text-[var(--gold2)]"}`}
                >
                  <IcSpeaker size={18} />
                </button>
              </div>

              <button onClick={hangup} className="btn btn-red mt-6 w-full py-3.5">
                <IcPhoneOff size={16} /> {phase === "active" ? "Разъединить" : "Отменить вызов"}
              </button>
            </div>
          )}
        </div>

        <p className="mono mt-3 max-w-md text-center text-[10px] leading-5 tracking-[0.12em] text-[var(--dim)]">
          СВЯЗЬ УСТАНАВЛИВАЕТСЯ НАПРЯМУЮ (WEBRTC). ДЛЯ ПРОВЕРКИ ОТКРОЙТЕ СЕТЬ ВО ВТОРОЙ ВКЛАДКЕ И ВОЙДИТЕ ПОД
          ДРУГИМ IŦIRINIO — ВЫЗОВ ПОСТУПИТ ТУДА. ВСЕ РАЗГОВОРЫ АРХИВИРУЮТСЯ ПО КГТ.
        </p>
      </div>

      {/* входящий вызов */}
      {phase === "incoming" && peer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="panel siteIn w-full max-w-md border-[rgba(212,175,55,.5)] p-6 text-center">
            <p className="mono text-[10px] tracking-[0.3em] text-[var(--red3)] blink">ВХОДЯЩИЙ ВЫЗОВ ГИКС</p>
            <div className="mt-5 flex justify-center">
              <div className="relative h-20 w-20">
                <div className="ring-in absolute inset-0 rounded-full border border-[var(--gold)]" />
                <div className="ring-in absolute inset-0 rounded-full border border-[var(--gold)]" style={{ animationDelay: "0.5s" }} />
                <div className="absolute inset-0 flex items-center justify-center rounded-full border border-[var(--line2)] bg-[#0a0a0a]">
                  <SiteMark label={peer.name[0]} hue="var(--gold)" size={46} />
                </div>
              </div>
            </div>
            <p className="mt-4 text-[13.5px] text-[var(--txt)]">
              Входящий вызов от: <span className="font-bold text-[var(--gold2)]">{peer.name}</span>
            </p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => void acceptCall()} className="btn btn-gold flex-1 py-3.5">
                <IcPhone size={15} /> Принять
              </button>
              <button onClick={declineCall} className="btn btn-red flex-1 py-3.5">
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
