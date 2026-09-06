import { useEffect, useMemo, useRef, useState } from "react";
import {
  useDB,
  domainFull,
  findDomain,
  resolveHost,
  unreadCount,
  onToast,
  toast,
  LEGAL_SHORT,
  LEGAL_FULL,
  ROLE_LABEL,
  KIND_LABEL,
  fmtTime,
  type Domain,
  type User,
  type ToastMsg,
} from "../lib/db";
import { Emblem, IcArrowL, IcArrowR, IcHome, IcLock, IcMail, IcPower, IcRefresh, IcX, SiteMark } from "../lib/icons";
import KrgSite from "./sites/KrgSite";
import PostSite from "./sites/PostSite";
import GiksSite from "./sites/GiksSite";
import KanceSite from "./sites/KanceSite";
import { BankSite, GnicstSite, AgencySite, ServiceSite, StubSite } from "./sites/OtherSites";

const TABS = [
  { host: "krg.arg", label: "Портал" },
  { host: "post.arg", label: "КЭП" },
  { host: "call.arg", label: "ГИКС" },
  { host: "sb.arg", label: "Банк" },
];

function siteAccess(d: Domain, u: User): boolean {
  if (d.kind === "admin") return u.role === "root" || u.role === "operator";
  if (d.kind === "monitor") return u.role === "root" || u.role === "tech";
  return true;
}

export default function Browser({ user, onLogout }: { user: User; onLogout: () => void }) {
  useDB();
  const [hist, setHist] = useState<string[]>(["krg.arg"]);
  const [idx, setIdx] = useState(0);
  const [addr, setAddr] = useState("krg.arg");
  const [loading, setLoading] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [legal, setLegal] = useState(false);
  const [clock, setClock] = useState(() => new Date());
  const loadTimer = useRef<number | null>(null);

  const host = hist[idx];
  const domain = findDomain(host);
  const allowed = domain ? siteAccess(domain, user) : false;
  const unread = unreadCount(user.login);

  useEffect(() => {
    const iv = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  const go = (h: string, push = true) => {
    const r = resolveHost(h);
    if (push) {
      setHist((p) => [...p.slice(0, idx + 1), r]);
      setIdx((i) => i + 1);
    } else {
      setHist((p) => p.map((x, i) => (i === idx ? r : x)));
    }
    setAddr(r);
    setLoading(true);
    if (loadTimer.current) window.clearTimeout(loadTimer.current);
    loadTimer.current = window.setTimeout(() => setLoading(false), 420);
  };

  const submitAddr = (e: React.FormEvent) => {
    e.preventDefault();
    go(addr);
  };

  const currentSite = useMemo(() => {
    if (!domain) return null;
    if (!allowed) return "denied";
    switch (domain.kind) {
      case "portal":
        return <KrgSite user={user} nav={go} mirror={!!domain.mirror} />;
      case "mail":
        return <PostSite user={user} />;
      case "voip":
        return <GiksSite user={user} />;
      case "admin":
        return <KanceSite user={user} />;
      case "bank":
        return <BankSite user={user} />;
      case "monitor":
        return <GnicstSite user={user} />;
      case "agency":
        return <AgencySite user={user} agency={domain.agency ?? "kustos"} />;
      case "service":
        return <ServiceSite user={user} onLogout={onLogout} />;
      default:
        return <StubSite domain={domain} nav={go} />;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host, user, allowed, nonce, unread]);

  return (
    <div className="flex h-screen flex-col">
      {/* верхняя панель браузера */}
      <header className="shrink-0 border-b border-[var(--line)] bg-[#0d0d0d]">
        <div className="flex items-center gap-1.5 px-2.5 pt-2">
          <div className="flex items-center gap-1.5 pr-2">
            <span className="h-2.5 w-2.5 rounded-full border border-[var(--line2)] bg-[#2a2a2a]" />
            <span className="h-2.5 w-2.5 rounded-full border border-[var(--line2)] bg-[#2a2a2a]" />
            <span className="h-2.5 w-2.5 rounded-full border border-[var(--line2)] bg-[rgba(139,0,0,.7)]" />
          </div>
          {TABS.map((t) => (
            <button
              key={t.host}
              onClick={() => go(t.host)}
              className={`relative flex items-center gap-2 border border-b-0 px-4 py-1.5 text-[11.5px] font-semibold tracking-wide transition-colors ${
                host === t.host
                  ? "border-[var(--line)] bg-[var(--ink)] text-[var(--gold2)]"
                  : "border-transparent text-[var(--txt2)] hover:text-[var(--txt)]"
              }`}
            >
              {t.label}
              {t.host === "post.arg" && unread > 0 && (
                <span className="mono flex h-4 min-w-4 items-center justify-center bg-[var(--red)] px-1 text-[9px] font-bold text-white">
                  {unread}
                </span>
              )}
              {host === t.host && <span className="absolute inset-x-0 top-0 h-[2px] bg-[var(--gold)]" />}
            </button>
          ))}
          <span className="mono ml-auto hidden text-[9.5px] tracking-[0.25em] text-[var(--dim)] sm:block">
            БРАУЗЕР ARG-NET • ЛОКАЛЬНАЯ ЗОНА
          </span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 pb-2 pt-1.5">
          <button
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
            className="flex h-8 w-8 items-center justify-center border border-transparent text-[var(--txt2)] transition-colors hover:border-[var(--line2)] hover:text-[var(--gold2)] disabled:opacity-25"
            title="Назад"
          >
            <IcArrowL size={15} />
          </button>
          <button
            onClick={() => setIdx((i) => Math.min(hist.length - 1, i + 1))}
            disabled={idx >= hist.length - 1}
            className="flex h-8 w-8 items-center justify-center border border-transparent text-[var(--txt2)] transition-colors hover:border-[var(--line2)] hover:text-[var(--gold2)] disabled:opacity-25"
            title="Вперёд"
          >
            <IcArrowR size={15} />
          </button>
          <button
            onClick={() => go("krg.arg")}
            className="flex h-8 w-8 items-center justify-center border border-transparent text-[var(--txt2)] transition-colors hover:border-[var(--line2)] hover:text-[var(--gold2)]"
            title="Портал Коллегий"
          >
            <IcHome size={15} />
          </button>
          <button
            onClick={() => go(host, false)}
            className="flex h-8 w-8 items-center justify-center border border-transparent text-[var(--txt2)] transition-colors hover:border-[var(--line2)] hover:text-[var(--gold2)]"
            title="Обновить"
          >
            <IcRefresh size={15} className={loading ? "spin-slow" : ""} />
          </button>

          <form onSubmit={submitAddr} className="mx-1 flex h-8 min-w-0 flex-1 items-center gap-2 border border-[var(--line)] bg-[#0a0a0a] px-2.5 transition-colors focus-within:border-[var(--gold)]">
            <IcLock size={12} className="shrink-0 text-[var(--gold)]" />
            <input
              value={addr}
              onChange={(e) => setAddr(e.target.value)}
              onFocus={(e) => e.target.select()}
              className="mono min-w-0 flex-1 bg-transparent text-[12.5px] text-[var(--txt)] outline-none placeholder:text-[var(--dim)]"
              placeholder="узел.arg или узел.anct"
              spellCheck={false}
            />
            {loading ? (
              <span className="mono shrink-0 text-[9px] tracking-[0.2em] text-[var(--gold)] blink">ЗАПРОС…</span>
            ) : (
              <span className="mono hidden shrink-0 text-[9px] tracking-[0.2em] text-[var(--dim)] sm:block">
                {domain ? `ПОРТ ${domain.port}` : "DNS АРГИИ"}
              </span>
            )}
          </form>

          <div className="mono hidden items-center gap-2 text-[10px] text-[var(--txt2)] lg:flex">
            <Emblem size={26} />
            <div className="leading-tight">
              <div className="font-semibold text-[var(--gold2)]">{user.role === "root" ? "Е.И.В. " : "гр. "}{user.name}</div>
              <div className="text-[9px] text-[var(--dim)]">{ROLE_LABEL[user.role]} • ГиКС {user.giks}</div>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex h-8 items-center gap-1.5 border border-[rgba(139,0,0,.55)] px-2.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--red3)] transition-all hover:border-[var(--red2)] hover:bg-[rgba(139,0,0,.18)]"
            title="Разорвать соединение"
          >
            <IcPower size={13} /> Выход
          </button>
        </div>
        <div className="goldline" />
      </header>

      {/* рабочая область */}
      <main className="relative min-h-0 flex-1 overflow-y-auto">
        <div key={`${host}-${nonce}`} className="siteIn h-full">
          {loading ? (
            <div className="flex h-full flex-col items-center justify-center gap-4">
              <Emblem size={64} className="spin-slow" />
              <p className="mono text-[11px] tracking-[0.3em] text-[var(--dim)] blink">ЗАПРОС К УЗЛУ {host.toUpperCase()}…</p>
            </div>
          ) : !domain ? (
            <NotFound host={host} go={go} />
          ) : !allowed ? (
            <Denied host={host} user={user} />
          ) : (
            currentSite
          )}
        </div>
      </main>

      {/* статус-бар */}
      <footer className="mono flex h-8 shrink-0 items-center gap-3 overflow-hidden border-t border-[var(--line)] bg-[#0d0d0d] px-3 text-[9.5px] tracking-[0.14em] text-[var(--dim)]">
        <span className="flex items-center gap-1.5">
          <span className="dot-live inline-block h-1.5 w-1.5 rounded-full bg-[var(--gold)]" />
          {LEGAL_SHORT}
        </span>
        <button onClick={() => setLegal(true)} className="shrink-0 text-[var(--gold)] transition-colors hover:text-[var(--gold2)]">
          [ЗАЯВЛЕНИЕ]
        </button>
        <span className="ml-auto hidden sm:block">{host.toUpperCase()}</span>
        <span className="text-[var(--txt2)]">{clock.toLocaleTimeString("ru-RU")}</span>
      </footer>

      {/* герб в углу экрана (ТЗ п.8) */}
      <div className="pointer-events-none fixed bottom-10 right-3 z-30 hidden opacity-40 md:block">
        <Emblem size={64} />
      </div>

      {/* заявление о режиме секретности */}
      {legal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onClick={() => setLegal(false)}>
          <div className="panel w-full max-w-xl border-[rgba(212,175,55,.4)] p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="display text-lg font-bold text-[var(--gold2)]">ЗАЯВЛЕНИЕ О РЕЖИМЕ СЕКРЕТНОСТИ</h3>
                <p className="mono mt-0.5 text-[9.5px] tracking-[0.2em] text-[var(--dim)]">И ОБРАБОТКЕ ДАННЫХ • ЕГИКС ARG-NET</p>
              </div>
              <button onClick={() => setLegal(false)} className="text-[var(--dim)] transition-colors hover:text-[var(--red3)]">
                <IcX size={18} />
              </button>
            </div>
            <div className="goldline my-4" />
            <ol className="space-y-3">
              {LEGAL_FULL.map((p, i) => (
                <li key={i} className="flex gap-3 text-[12.5px] leading-relaxed text-[var(--txt2)]">
                  <span className="mono shrink-0 text-[var(--gold)]">{i + 1}.</span>
                  {p}
                </li>
              ))}
            </ol>
            <button className="btn btn-gold mt-5 w-full" onClick={() => setLegal(false)}>
              Принимаю и обязуюсь соблюдать
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- страницы отказов ---------- */

function NotFound({ host, go }: { host: string; go: (h: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="mono text-[11px] tracking-[0.3em] text-[var(--dim)]">DNS АРГИИ • ОТВЕТ: NXDOMAIN</div>
      <h1 className="display mt-4 text-3xl font-extrabold text-[var(--txt)]">
        УЗЕЛ <span className="text-[var(--red3)]">{host}</span> НЕ ЧИСЛИТСЯ В РЕЕСТРЕ
      </h1>
      <p className="mt-3 max-w-md text-[13px] leading-relaxed text-[var(--txt2)]">
        Доменное имя не найдено в государственном реестре зон .arg и .anct. Возможно, домен ещё не выделен
        Канцелярией либо был исключён из реестра.
      </p>
      <div className="mt-6 flex gap-2">
        <button className="btn" onClick={() => go("registr-не найден")}>Проверить реестр</button>
        <button className="btn btn-gold" onClick={() => go("krg.arg")}>На портал Коллегий</button>
      </div>
    </div>
  );
}

function Denied({ host, user }: { host: string; user: User }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center border border-[var(--red2)] bg-[rgba(139,0,0,.14)]">
        <IcLock size={28} className="text-[var(--red3)]" />
      </div>
      <p className="mono mt-5 text-[11px] tracking-[0.3em] text-[var(--red3)]">ОШИБКА АВТОРИЗАЦИИ • ДОСТУП ЗАПРЕЩЁН</p>
      <h1 className="display mt-3 text-2xl font-extrabold sm:text-3xl">
        УЗЕЛ {host.toUpperCase()} — <span className="text-[var(--red3)]">ЗАКРЫТЫЙ КОНТУР</span>
      </h1>
      <p className="mt-3 max-w-lg text-[13px] leading-relaxed text-[var(--txt2)]">
        Ваш мандат доступа ({ROLE_LABEL[user.role]}, Iŧirinio {user.itirinio}) не предоставляет полномочий для
        входа на данный узел. Попытка обращения зарегистрирована в журнале аудита и передана в Kostosęrio dę
        Arcanum для анализа в соответствии со Ст. 1 (187) КГТ.
      </p>
      <p className="mono mt-6 text-[10px] tracking-[0.22em] text-[var(--dim)]">
        САМОВОЛЬНОЕ ПРОНИКНОВЕНИЕ ПРЕСЛЕДУЕТСЯ ПО СТ. 14 (79) ЗАКОНА TOQORRO
      </p>
    </div>
  );
}

/* ---------- тосты ---------- */

export function ToastHost() {
  const [items, setItems] = useState<ToastMsg[]>([]);
  useEffect(
    () =>
      onToast((t) => {
        setItems((p) => [...p, t]);
        setTimeout(() => setItems((p) => p.filter((x) => x.id !== t.id)), 3400);
      }),
    []
  );
  return (
    <div className="pointer-events-none fixed bottom-10 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className={`fadeUp mono flex items-center gap-2.5 border px-4 py-2.5 text-[11.5px] tracking-wide ${
            t.kind === "err"
              ? "border-[var(--red2)] bg-[rgba(30,4,4,.95)] text-[var(--red3)]"
              : t.kind === "info"
                ? "border-[var(--line2)] bg-[rgba(20,20,20,.95)] text-[var(--txt2)]"
                : "border-[var(--gold)] bg-[rgba(24,19,5,.95)] text-[var(--gold2)]"
          }`}
        >
          {t.kind === "err" ? <IcX size={13} /> : t.kind === "info" ? <IcMail size={13} /> : <SiteMark label="✓" hue="var(--gold)" size={16} />}
          {t.text}
        </div>
      ))}
    </div>
  );
}
