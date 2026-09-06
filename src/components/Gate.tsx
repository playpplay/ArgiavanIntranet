import { useEffect, useState } from "react";
import { authUser, LEGAL_FULL, ROLE_LABEL, toast, type User } from "../lib/db";
import { Emblem, IcChevD, IcEye, IcEyeOff, IcLock, IcShield } from "../lib/icons";

const STEPS = [
  "ПРОВЕРКА IŦIRINIO…",
  "СВЕРКА С ГОСУДАРСТВЕННЫМ РЕЕСТРОМ…",
  "ЗАПРОС В ГНИЦСТ (КГТ СТ. 1 (187))…",
  "ВЫДАЧА МАНДАТА ДОСТУПА…",
];

const DEMO: Array<{ it: string; pass: string; role: string }> = [
  { it: "A-000-001", pass: "arg-root", role: "Верховный Администратор (Император)" },
  { it: "A-000-010", pass: "arg-tech", role: "Технический специалист ГНИЦСТ" },
  { it: "A-000-017", pass: "arg-mod", role: "Модератор Стражи" },
  { it: "A-000-021", pass: "arg-op", role: "Оператор Коллегии" },
  { it: "A-001-291", pass: "arg-1234", role: "Ťivitano (гражданин)" },
  { it: "A-010-005", pass: "arg-1234", role: "Юридическое лицо" },
];

export default function Gate({ onLogin }: { onLogin: (u: User) => void }) {
  const [it, setIt] = useState("");
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  const [phase, setPhase] = useState<"form" | "auth" | "ok">("form");
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [legal, setLegal] = useState(false);
  const [clock, setClock] = useState(() => new Date());
  const [grantedTo, setGrantedTo] = useState<User | null>(null);

  useEffect(() => {
    const iv = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (phase !== "form") return;
    if (!it.trim() || !pass) {
      setError("Поля IŦIRINIO и ПАРОЛЬ обязательны к заполнению.");
      setShake((s) => s + 1);
      return;
    }
    setError(null);
    setPhase("auth");
    setStep(0);
    STEPS.forEach((_, i) => setTimeout(() => setStep(i + 1), 450 * (i + 1)));
    setTimeout(() => {
      const r = authUser(it, pass);
      if (r.ok) {
        setGrantedTo(r.user);
        setPhase("ok");
        setTimeout(() => onLogin(r.user), 1500);
      } else {
        setPhase("form");
        setShake((s) => s + 1);
        if (r.reason === "badpass") {
          setError("Пароль не принят. Попытка входа зарегистрирована в журнале аудита ЕГИКС.");
        } else {
          setError(
            "Указанный идентификатор Iŧirinio не найден в Государственном реестре или заблокирован. Попытка входа зарегистрирована и передана в Kostosęrio dę Arcanum для анализа."
          );
        }
      }
    }, 450 * STEPS.length + 500);
  };

  return (
    <div className="relative flex min-h-full flex-col items-center justify-center px-4 py-10">
      {/* верхняя служебная строка */}
      <div className="mono pointer-events-none absolute left-4 top-3 text-[10px] tracking-[0.25em] text-[var(--dim)]">
        ЕГИКС • УЗЕЛ 01 • ЛОКАЛЬНЫЙ КОНТУР
      </div>
      <div className="mono pointer-events-none absolute right-4 top-3 text-[10px] tracking-[0.25em] text-[var(--dim)]">
        {clock.toLocaleDateString("ru-RU")} {clock.toLocaleTimeString("ru-RU")}
      </div>

      <div key={shake} className={`w-full max-w-xl ${shake ? "shake" : ""}`}>
        {/* герб и заголовок */}
        <div className="fadeUp flex flex-col items-center text-center">
          <Emblem size={92} />
          <div className="mt-3 chip chip-gold">ДЛЯ СЛУЖЕБНОГО ПОЛЬЗОВАНИЯ (DSP)</div>
          <h1 className="display mt-4 text-2xl font-extrabold leading-snug tracking-wide sm:text-[27px]">
            ГОСУДАРСТВЕННЫЙ СЕГМЕНТ СЕТИ <span className="text-[var(--gold)]">ARG-NET</span>
          </h1>
          <p className="mono mt-1 text-[10.5px] tracking-[0.3em] text-[var(--dim)]">LOGIN.ARG • ПОРТ 8000 • ЕДИНЫЙ ПОРТАЛ АУТЕНТИФИКАЦИИ</p>
          <p className="mt-4 max-w-md text-[13px] leading-relaxed text-[var(--txt2)]">
            Введите ваш действительный номер Iŧirinio и пароль для аутентификации.
          </p>
        </div>

        {/* форма */}
        <form onSubmit={submit} className="panel fadeUp mt-6 p-6" style={{ animationDelay: "120ms" }}>
          {phase === "ok" && grantedTo ? (
            <div className="siteIn flex flex-col items-center py-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center border border-[var(--gold)] bg-[rgba(212,175,55,.08)]">
                <IcShield size={30} className="text-[var(--gold)]" />
              </div>
              <p className="mt-4 text-sm leading-relaxed text-[var(--txt)]">
                Аутентификация пройдена. Добро пожаловать в систему,{" "}
                <span className="font-bold text-[var(--gold2)]">
                  {grantedTo.role === "root" ? "Ваше Величество" : `гр. ${grantedTo.name}`}
                </span>
                .
                <br />
                Ваш текущий статус: <span className="font-semibold">{ROLE_LABEL[grantedTo.role]}</span>. Iŧirinio подтверждён.
              </p>
              <p className="mono mt-4 text-[10px] tracking-[0.25em] text-[var(--dim)] blink">ПЕРЕДАЧА МАНДАТА ДОСТУПА…</p>
            </div>
          ) : phase === "auth" ? (
            <div className="mono space-y-2.5 py-6 text-[12px] tracking-[0.15em]">
              {STEPS.map((s, i) => (
                <div key={s} className="flex items-center gap-3">
                  <span
                    className={
                      i < step ? "text-[var(--gold)]" : i === step ? "blink text-[var(--txt)]" : "text-[var(--dim)] opacity-40"
                    }
                  >
                    {i < step ? "▣" : "▢"}
                  </span>
                  <span className={i < step ? "text-[var(--txt2)]" : i === step ? "text-[var(--txt)]" : "text-[var(--dim)] opacity-40"}>
                    {s}
                  </span>
                  {i < step && <span className="ml-auto text-[10px] text-[var(--gold)]">ОК</span>}
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                <div className="space-y-4">
                  <div>
                    <label className="mono mb-1.5 block text-[10px] tracking-[0.22em] text-[var(--dim)]">IŦIRINIO</label>
                    <input
                      className="field mono text-[15px] tracking-widest"
                      placeholder="A-000-000"
                      value={it}
                      onChange={(e) => setIt(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="mono mb-1.5 block text-[10px] tracking-[0.22em] text-[var(--dim)]">ПАРОЛЬ</label>
                    <div className="relative">
                      <input
                        className="field mono pr-11 text-[15px] tracking-widest"
                        type={show ? "text" : "password"}
                        placeholder="••••••••"
                        value={pass}
                        onChange={(e) => setPass(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShow((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--dim)] transition-colors hover:text-[var(--gold)]"
                      >
                        {show ? <IcEyeOff size={17} /> : <IcEye size={17} />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-end">
                  <button type="submit" className="btn btn-gold w-full px-6 py-[1.05rem] sm:w-auto">
                    <IcLock size={15} /> Войти в систему
                  </button>
                </div>
              </div>

              {error && (
                <div className="siteIn mt-4 border border-[rgba(194,43,43,.55)] bg-[rgba(139,0,0,.14)] p-3.5">
                  <p className="mono text-[10px] tracking-[0.25em] text-[var(--red3)]">ОШИБКА АВТОРИЗАЦИИ</p>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#e8c9c5]">{error}</p>
                </div>
              )}

              <p className="mt-4 flex items-start gap-2 border-t border-[var(--line)] pt-3.5 text-[11.5px] leading-relaxed text-[var(--dim)]">
                <span className="mt-0.5 shrink-0 text-[var(--red2)]">▲</span>
                Предупреждение: несанкционированный доступ преследуется по ст. 14 (79) и ст. 10 (74) Закона Toqorro.
              </p>
            </>
          )}
        </form>

        {/* заявление */}
        <button
          onClick={() => setLegal((l) => !l)}
          className="mono mt-4 flex w-full items-center gap-2 px-1 text-[10px] tracking-[0.22em] text-[var(--dim)] transition-colors hover:text-[var(--gold)]"
        >
          <IcChevD size={13} className={`transition-transform ${legal ? "rotate-180" : ""}`} />
          ЗАЯВЛЕНИЕ О РЕЖИМЕ СЕКРЕТНОСТИ И ОБРАБОТКЕ ДАННЫХ
        </button>
        {legal && (
          <ol className="panel siteIn mt-2 space-y-2.5 p-4">
            {LEGAL_FULL.map((p, i) => (
              <li key={i} className="flex gap-2.5 text-[12px] leading-relaxed text-[var(--txt2)]">
                <span className="mono shrink-0 text-[var(--gold)]">{i + 1}.</span>
                {p}
              </li>
            ))}
          </ol>
        )}

        {/* демо-доступы */}
        <div className="panel fadeUp mt-5 p-4" style={{ animationDelay: "200ms" }}>
          <p className="mono text-[10px] tracking-[0.22em] text-[var(--dim)]">
            ДЕМОНСТРАЦИОННЫЕ IŦIRINIO ПРОТОТИПА <span className="text-[var(--gold)]">(данные — в вашем браузере)</span>
          </p>
          <div className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
            {DEMO.map((d) => (
              <button
                key={d.it}
                onClick={() => {
                  setIt(d.it);
                  setPass(d.pass);
                  setError(null);
                  toast(`Реквизиты ${d.it} подставлены в форму`, "info");
                }}
                className="group flex items-center gap-2.5 border border-transparent px-2 py-1.5 text-left transition-all hover:border-[var(--line2)] hover:bg-[rgba(212,175,55,.04)]"
              >
                <span className="mono text-[12px] font-semibold text-[var(--gold2)] transition-colors group-hover:text-[var(--gold)]">
                  {d.it}
                </span>
                <span className="mono text-[10.5px] text-[var(--dim)]">{d.pass}</span>
                <span className="ml-auto hidden text-[10.5px] text-[var(--txt2)] md:block">{d.role}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mono mt-6 text-center text-[9.5px] leading-5 tracking-[0.22em] text-[var(--dim)]">
        СОБСТВЕННОСТЬ АРГСКОЙ ИМПЕРИИ • СТ. 123 ROTTO • РАЗРАБОТЧИК: KOSTOSĘRIO DĘ ARCANUM (ГНИЦСТ)
      </div>
    </div>
  );
}
