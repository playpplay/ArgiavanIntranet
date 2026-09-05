import { useEffect, useRef, useState } from "react";
import { authUser, toast, type User } from "../lib/db";
import { Emblem, IcBan, IcEye, IcEyeOff, IcPower, IcShield, IcSignal } from "../lib/icons";

const HANDSHAKE = [
  "> рукопожатие с узлом 01-столица .............. ОК",
  "> проверка подданства и пароля ................ ОК",
  "> ключ сессии АРГ-256 принят",
  "> ДОСТУП РАЗРЕШЁН",
];

const TICKER = [
  "Указ №17 — о едином адресном пространстве .arg и .anct",
  "Канцелярия напоминает: передача пароля третьим лицам карается отключением от сети",
  "Узел 07 «Верхний Аргск» несёт дежурство в штатном режиме",
  "Пошлина за имя в зоне .arg — три империала в год, в зоне .anct — один",
  "Самовольное захватничество доменных имён пресекается по Уложению о тайне",
];

export default function Gate({ onLogin }: { onLogin: (u: User) => void }) {
  const [login, setLogin] = useState("");
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [phase, setPhase] = useState<"idle" | "hand">("idle");
  const [shown, setShown] = useState(0);
  const pending = useRef<User | null>(null);

  useEffect(() => {
    if (phase !== "hand") return;
    const timers = HANDSHAKE.map((_, i) => setTimeout(() => setShown(i + 1), 300 * (i + 1)));
    timers.push(
      setTimeout(() => {
        if (pending.current) onLogin(pending.current);
      }, 300 * HANDSHAKE.length + 700)
    );
    return () => timers.forEach(clearTimeout);
  }, [phase, onLogin]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const u = authUser(login, pass);
    if (!u) {
      setErr("ОТКАЗАНО: неверная пара логин / пароль");
      setShakeKey((k) => k + 1);
      toast("Доступ запрещён. Пароль выдает администратор.", "err");
      return;
    }
    setErr(null);
    pending.current = u;
    setPhase("hand");
  };

  const fill = (l: string, p: string) => {
    setLogin(l);
    setPass(p);
    setErr(null);
    toast("Данные подставлены — жмите «Установить соединение»", "info");
  };

  return (
    <div className="relative min-h-screen lg:grid lg:grid-cols-[1.15fr_1fr]">
      {/* левая створка — манифест сети */}
      <div className="relative hidden border-r border-[var(--line)] lg:flex lg:flex-col lg:justify-between lg:p-10 lg:pb-16">
        <span className="vert mono absolute left-5 top-1/2 -translate-y-1/2 text-[10px] tracking-[0.35em] text-[var(--dim)]">
          СЕТЕВОЙ УСТАВ • УКАЗ №7 • ДОПУСК ТОЛЬКО ДЛЯ ПОДДАННЫХ ИМПЕРИИ
        </span>

        <div className="flex items-center justify-between pl-10">
          <span className="display text-sm tracking-[0.2em] text-[var(--txt)]">АРГСКАЯ ИМПЕРИЯ</span>
          <span className="mono text-[10px] tracking-[0.2em] text-[var(--dim)]">
            МИНИСТЕРСТВО СВЯЗИ И ЦИФРОВЫХ ДОМЕНОВ
          </span>
        </div>

        <div className="pl-10">
          <Emblem size={128} className="mb-8" />
          <h1 className="display text-6xl leading-none tracking-wide text-[var(--txt)] xl:text-7xl">
            АРГО<span className="text-[var(--brass)]">НЕТ</span>
          </h1>
          <p className="mono mt-4 text-[11px] tracking-[0.35em] text-[var(--txt2)]">
            ВНУТРЕННЯЯ СЕТЬ ИМПЕРИИ
          </p>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-[var(--txt2)]">
            Суверенное адресное пространство в двух зонах — <b className="text-[var(--brass2)]">.arg</b> для
            учреждений Империи и <b className="text-[var(--verd2)]">.anct</b> для служб и подданных.
            Почта, голосовая связь и реестр доменов — под одной крышей и одним паролем.
          </p>
          <div className="mono mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-[var(--txt2)]">
            <span className="flex items-center gap-2">
              <span className="dot-live inline-block h-2 w-2 rounded-full bg-[var(--verd)]" />
              КАНАЛ: СТАБИЛЕН
            </span>
            <span className="flex items-center gap-2">
              <IcSignal size={14} className="text-[var(--brass)]" /> УЗЕЛ 01 — СТОЛИЦА
            </span>
            <span className="flex items-center gap-2">
              <IcShield size={14} className="text-[var(--brass)]" /> ШИФР АРГ-256
            </span>
          </div>
        </div>

        <div className="mono pl-10 text-[10px] tracking-[0.25em] text-[var(--dim)]">
          ОСНОВАНА В 412-Й ДЕНЬ ДО НЫНЕШНЕГО • ДВЕНАДЦАТЬ УЗЛОВ
        </div>
      </div>

      {/* правая створка — терминал доступа */}
      <div className="flex min-h-screen items-center justify-center p-6 lg:min-h-0 lg:p-14 lg:pb-20">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex items-center gap-4">
            <Emblem size={64} />
            <div>
              <div className="display text-2xl tracking-wide">АРГОНЕТ</div>
              <div className="mono text-[10px] tracking-[0.3em] text-[var(--txt2)]">ВНУТРЕННЯЯ СЕТЬ ИМПЕРИИ</div>
            </div>
          </div>

          <div key={shakeKey} className={`panel relative p-8 ${err ? "shake" : ""}`}>
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-[var(--brass)] to-transparent" />
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="display text-2xl tracking-wide">ВХОД В СЕТЬ</h2>
                <p className="mt-1 text-[13px] text-[var(--txt2)]">
                  Доступ жалует администратор — Имперская канцелярия.
                </p>
              </div>
              <IcShield size={26} className="text-[var(--brass)]" />
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="mono mb-1.5 block text-[10px] tracking-[0.25em] text-[var(--dim)]">
                  ЛОГИН ПОДДАННОГО
                </label>
                <input
                  className="field mono"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="например, imperator"
                  autoComplete="username"
                  autoFocus
                />
              </div>
              <div>
                <label className="mono mb-1.5 block text-[10px] tracking-[0.25em] text-[var(--dim)]">ПАРОЛЬ</label>
                <div className="relative">
                  <input
                    className="field mono pr-11"
                    type={show ? "text" : "password"}
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--dim)] transition-colors hover:text-[var(--brass2)]"
                    aria-label="Показать пароль"
                  >
                    {show ? <IcEyeOff size={17} /> : <IcEye size={17} />}
                  </button>
                </div>
              </div>

              {err && (
                <p className="mono flex items-center gap-2 border border-[rgba(198,90,69,.4)] bg-[rgba(198,90,69,.08)] px-3 py-2 text-[12px] text-[var(--signal2)]">
                  <IcBan size={14} /> {err}
                </p>
              )}

              <button type="submit" className="btn btn-brass w-full py-3">
                <IcPower size={16} /> Установить соединение
              </button>
            </form>

            <div className="mt-6 border border-[var(--line)] bg-[rgba(10,17,14,.6)] p-3">
              <p className="mono mb-2 text-[10px] tracking-[0.25em] text-[var(--dim)]">
                ДЕМО-ДОСТУП ПРОТОТИПА — нажмите, чтобы подставить
              </p>
              <div className="space-y-1.5">
                <button
                  onClick={() => fill("imperator", "arg-0001")}
                  className="mono flex w-full items-center justify-between px-2 py-1.5 text-left text-[12px] text-[var(--txt2)] transition-colors hover:bg-[rgba(201,163,92,.08)] hover:text-[var(--brass2)]"
                >
                  <span>imperator / arg-0001</span>
                  <span className="chip chip-arg">администратор</span>
                </button>
                <button
                  onClick={() => fill("ivanov", "arg-0002")}
                  className="mono flex w-full items-center justify-between px-2 py-1.5 text-left text-[12px] text-[var(--txt2)] transition-colors hover:bg-[rgba(79,156,134,.08)] hover:text-[var(--verd2)]"
                >
                  <span>ivanov / arg-0002</span>
                  <span className="chip chip-anct">подданный</span>
                </button>
              </div>
            </div>
          </div>

          <p className="mono mt-4 text-center text-[10px] tracking-[0.15em] text-[var(--dim)]">
            БОЕВОЙ УЗЕЛ — PYTHONANYWHERE • ФЛАСК + СКУЛАЙТ • ПАРОЛИ — БКРИПТ
          </p>
        </div>
      </div>

      {/* бегущая строка указов */}
      <div className="absolute inset-x-0 bottom-0 overflow-hidden border-t border-[var(--line)] bg-[rgba(10,17,14,.85)] py-2">
        <div className="marquee mono text-[11px] tracking-[0.12em] text-[var(--txt2)]">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0">
              {TICKER.map((t, i) => (
                <span key={i} className="flex items-center whitespace-nowrap pr-12">
                  <span className="mr-3 text-[var(--brass)]">✦</span> {t}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* рукопожатие */}
      {phase === "hand" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(9,15,12,.97)]">
          <div className="mono w-full max-w-lg px-6 text-[13px] leading-8 text-[var(--verd2)] sm:text-sm">
            {HANDSHAKE.slice(0, shown).map((l, i) => (
              <div key={i} className="fadeUp">
                {l}
                {i === shown - 1 && i === HANDSHAKE.length - 1 && pending.current && (
                  <span className="text-[var(--brass2)]">: {pending.current.name}</span>
                )}
              </div>
            ))}
            <span className="blink text-[var(--brass)]">█</span>
          </div>
        </div>
      )}
    </div>
  );
}
