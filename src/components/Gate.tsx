import { useEffect, useMemo, useState } from "react";
import { authUser, LEGAL_SHORT, roleLabel, toast, itirinioValid, type User } from "../lib/db";
import { Emblem, IcChevD, IcEye, IcEyeOff, IcLock, IcShield } from "../lib/icons";

const DEMO: Array<{ it: string; pass: string; role: string }> = [
  { it: "000000000000-000000000001", pass: "arg-root", role: "Верховный Администратор (Император)" },
  { it: "401277915320-883002174415", pass: "arg-tech", role: "Технический специалист ГНИЦСТ" },
  { it: "512208347761-902114530087", pass: "arg-mod", role: "Модератор (Стража)" },
  { it: "603915228407-114709263358", pass: "arg-oper", role: "Оператор Коллегии" },
  { it: "718442906513-229518074460", pass: "arg-civ", role: "Ťivitano (гражданин)" },
  { it: "900230010005-001002277931", pass: "arg-bank", role: "Юридическое лицо (StatusBanko)" },
];

type ErrKind = "notfound" | "blocked" | "badpass" | "format" | null;

export default function Gate({ onLogin }: { onLogin: (u: User) => void }) {
  const [it, setIt] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [err, setErr] = useState<ErrKind>(null);
  const [shake, setShake] = useState(0);
  const [phase, setPhase] = useState<"idle" | "check" | "ok">("idle");
  const [grantedTo, setGrantedTo] = useState<User | null>(null);
  const [legal, setLegal] = useState(false);
  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    const iv = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  const digits = it.replace(/\D/g, "").slice(0, 24);
  const formatted = digits.length > 12 ? `${digits.slice(0, 12)}-${digits.slice(12)}` : digits;

  const complete = formatted.length === 25;
  const canSubmit = complete && pass.length > 0 && phase === "idle";

  const hint = useMemo(() => {
    if (!formatted) return "введите 24 цифры номера";
    if (!complete) return `введено ${digits.length} из 24 цифр`;
    if (!itirinioValid(formatted)) return "проверьте формат";
    return "формат верен";
  }, [formatted, digits.length, complete]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (!itirinioValid(formatted)) {
      setErr("format");
      setShake((s) => s + 1);
      return;
    }
    setPhase("check");
    setErr(null);
    window.setTimeout(() => {
      const res = authUser(formatted, pass);
      if (res.ok) {
        setGrantedTo(res.user);
        setPhase("ok");
        toast(`Аутентификация пройдена. IŦirinio подтверждён.`);
        window.setTimeout(() => onLogin(res.user), 1500);
      } else {
        setErr(res.err);
        setPhase("idle");
        setShake((s) => s + 1);
      }
    }, 900);
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* верхняя строка */}
      <div className="mono flex items-center justify-between border-b border-[var(--line)] px-4 py-2 text-[10px] tracking-[0.18em] text-[var(--dim)]">
        <span>ЕГИКС ARG-NET • ГОСУДАРСТВЕННЫЙ СЕГМЕНТ</span>
        <span className="hidden sm:block">{clock.toLocaleDateString("ru-RU")} • {clock.toLocaleTimeString("ru-RU")}</span>
        <span className="text-[var(--gold)]">LOGIN.ARG : 8000</span>
      </div>
      <div className="goldline" />

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-10">
        <div className="grid gap-10 lg:grid-cols-[1fr_420px]">
          {/* левая колонка — герб и положение */}
          <div className="fadeUp flex flex-col justify-center">
            <Emblem size={110} />
            <p className="mono mt-6 text-[10px] tracking-[0.35em] text-[var(--gold)]">
              ЕДИНАЯ ГОСУДАРСТВЕННАЯ ИНФОРМАЦИОННО-КОММУНИКАЦИОННАЯ СЕТЬ
            </p>
            <h1 className="display mt-3 text-4xl font-extrabold leading-tight tracking-wide sm:text-5xl">
              ГОСУДАРСТВЕННЫЙ СЕГМЕНТ СЕТИ <span className="text-[var(--gold)]">ARG-NET</span>
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-[var(--txt2)]">
              Введите ваш действительный номер <span className="font-semibold text-[var(--txt)]">IŦirinio</span> и
              пароль для аутентификации. Доступ в сеть жалует Канцелярия Дворца Palacium Ręgnum.
            </p>

            <button
              onClick={() => setLegal((l) => !l)}
              className="mono mt-6 flex w-fit items-center gap-2 text-[10.5px] tracking-[0.2em] text-[var(--txt2)] transition-colors hover:text-[var(--gold2)]"
            >
              <IcChevD size={14} className={`transition-transform ${legal ? "rotate-180 text-[var(--gold)]" : ""}`} />
              ЗАЯВЛЕНИЕ О РЕЖИМЕ СЕКРЕТНОСТИ И ОБРАБОТКЕ ДАННЫХ
            </button>
            {legal && (
              <ol className="siteIn mono mt-3 max-w-md space-y-2 border-l border-[rgba(212,175,55,.4)] pl-4 text-[10.5px] leading-relaxed text-[var(--txt2)]">
                <li>1. Сеть является собственностью Империи Аргия (Ст. 123 ROTTO).</li>
                <li>2. Трафик, почта и вызовы ГиКС анализируются алгоритмами ГНИЦСТ (Ст. 1 (187) КГТ).</li>
                <li>3. Тайна переписки может быть ограничена трибуналом (Ст. 13.1 (22) Toqorro).</li>
                <li>4. Несанкционированный доступ преследуется по Ст. 14 (79) и Ст. 10 (74) Закона Toqorro.</li>
              </ol>
            )}
          </div>

          {/* форма входа */}
          <div className="fadeUp" style={{ animationDelay: "120ms" }}>
            <form
              key={shake}
              onSubmit={submit}
              className={`panel relative border-t-2 border-t-[var(--gold)] p-6 ${shake ? "shake" : ""}`}
            >
              <div className="flex items-center justify-between">
                <h2 className="display text-lg font-bold tracking-wider">ВХОД В СИСТЕМУ</h2>
                <IcShield size={20} className="text-[var(--gold)]" />
              </div>
              <div className="goldline my-4" />

              <label className="mono block text-[10px] tracking-[0.22em] text-[var(--dim)]">
                IŦIRINIO (НОМЕР ПАСПОРТА)
              </label>
              <input
                value={formatted}
                onChange={(e) => {
                  setIt(e.target.value);
                  setErr(null);
                }}
                placeholder="000000000000-000000000000"
                className="field mono mt-1.5 text-[15px] tracking-[0.08em]"
                inputMode="numeric"
                autoComplete="off"
                disabled={phase !== "idle"}
              />
              <p className={`mono mt-1 text-[10px] ${complete ? "text-[var(--gold)]" : "text-[var(--dim)]"}`}>{hint}</p>

              <label className="mono mt-4 block text-[10px] tracking-[0.22em] text-[var(--dim)]">ПАРОЛЬ</label>
              <div className="relative mt-1.5">
                <input
                  value={pass}
                  onChange={(e) => {
                    setPass(e.target.value);
                    setErr(null);
                  }}
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  className="field mono pr-10"
                  disabled={phase !== "idle"}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--dim)] transition-colors hover:text-[var(--gold)]"
                >
                  {showPass ? <IcEyeOff size={16} /> : <IcEye size={16} />}
                </button>
              </div>

              <button type="submit" disabled={!canSubmit} className="btn btn-gold mt-5 w-full py-3">
                {phase === "check" ? (
                  <span className="blink tracking-[0.25em]">ПРОВЕРКА РЕЕСТРА…</span>
                ) : (
                  <>
                    <IcLock size={14} /> Войти в систему
                  </>
                )}
              </button>

              {/* ошибки по нормативным текстам */}
              {err === "notfound" && (
                <div className="siteIn mt-4 border border-[var(--red2)] bg-[rgba(139,0,0,.14)] p-3">
                  <p className="mono text-[10.5px] font-bold tracking-[0.18em] text-[var(--red3)]">ОШИБКА АВТОРИЗАЦИИ</p>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--txt2)]">
                    Указанный идентификатор IŦirinio не найден в Государственном реестре паспортов или
                    заблокирован. Попытка входа зарегистрирована и передана в Kostosęrio dę Arcanum для анализа.
                  </p>
                </div>
              )}
              {err === "blocked" && (
                <div className="siteIn mt-4 border border-[var(--red2)] bg-[rgba(139,0,0,.14)] p-3">
                  <p className="mono text-[10.5px] font-bold tracking-[0.18em] text-[var(--red3)]">УЧЁТНАЯ ЗАПИСЬ ЗАБЛОКИРОВАНА</p>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--txt2)]">
                    Паспорт числится в реестре, однако доступ приостановлен решением уполномоченного лица.
                    Обращайтесь в Канцелярию Дворца. Попытка передана в ГНИЦСТ.
                  </p>
                </div>
              )}
              {err === "badpass" && (
                <div className="siteIn mt-4 border border-[var(--red2)] bg-[rgba(139,0,0,.14)] p-3">
                  <p className="mono text-[10.5px] font-bold tracking-[0.18em] text-[var(--red3)]">ОШИБКА АВТОРИЗАЦИИ</p>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--txt2)]">
                    Пароль не принят. Попытка входа зарегистрирована и передана в Kostosęrio dę Arcanum для анализа.
                  </p>
                </div>
              )}
              {err === "format" && (
                <p className="siteIn mono mt-3 text-[11px] text-[var(--red3)]">
                  Формат IŦirinio: 12 цифр, дефис, 12 цифр.
                </p>
              )}

              {/* успех */}
              {phase === "ok" && grantedTo && (
                <div className="siteIn mt-4 border border-[var(--gold)] bg-[rgba(212,175,55,.08)] p-3">
                  <p className="text-[12.5px] leading-relaxed text-[var(--txt)]">
                    Аутентификация пройдена. Добро пожаловать в систему,{" "}
                    <span className="font-bold text-[var(--gold2)]">{grantedTo.name}</span>.
                    <br />
                    Ваш текущий статус: <span className="font-semibold">{roleLabel(grantedTo.role)}</span>. IŦirinio
                    подтверждён.
                  </p>
                </div>
              )}

              <p className="mono mt-4 text-center text-[9px] leading-4 tracking-[0.14em] text-[var(--dim)]">
                ПРЕДУПРЕЖДЕНИЕ: НЕСАНКЦИОНИРОВАННЫЙ ДОСТУП ПРЕСЛЕДУЕТСЯ ПО СТ. 14 (79) И СТ. 10 (74) ЗАКОНА TOQORRO
              </p>
            </form>

            {/* демо-доступы прототипа */}
            <details className="group mt-4 border border-dashed border-[var(--line2)]">
              <summary className="mono cursor-pointer select-none px-3 py-2 text-[10px] tracking-[0.2em] text-[var(--txt2)] transition-colors hover:text-[var(--gold2)]">
                ДЕМО-ДОСТУПЫ ПРОТОТИПА (в боевом контуре будут скрыты)
              </summary>
              <table className="tbl mono text-[11px]">
                <thead>
                  <tr>
                    <th>IŦirinio</th>
                    <th>Пароль</th>
                    <th>Роль</th>
                  </tr>
                </thead>
                <tbody>
                  {DEMO.map((d) => (
                    <tr key={d.it} className="cursor-pointer" onClick={() => { setIt(d.it); setPass(d.pass); setErr(null); }}>
                      <td className="text-[var(--gold2)]">{d.it}</td>
                      <td>{d.pass}</td>
                      <td className="text-[var(--txt2)]">{d.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </div>
        </div>
      </div>

      <div className="goldline" />
      <footer className="mono flex items-center justify-between px-4 py-2.5 text-[9.5px] tracking-[0.16em] text-[var(--dim)]">
        <span>{LEGAL_SHORT}</span>
        <span className="hidden md:block">ИМПЕРИЯ АРГИЯ • ГНИЦСТ • ВЕРСИЯ УЗЛА 2.0</span>
      </footer>
    </div>
  );
}
