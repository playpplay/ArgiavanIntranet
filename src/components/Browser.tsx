import { useEffect, useRef, useState } from "react";
import {
  findDomain,
  resolveHost,
  useDB,
  domainFull,
  KIND_LETTER,
  onToast,
  type ToastMsg,
  type User,
} from "../lib/db";
import {
  Emblem,
  IcArrowL,
  IcArrowR,
  IcBan,
  IcHome,
  IcLock,
  IcPower,
  IcRefresh,
  IcWarn,
  SiteMark,
} from "../lib/icons";
import PortalSite from "./sites/PortalSite";
import MailSite from "./sites/MailSite";
import VoipSite from "./sites/VoipSite";
import AdminSite from "./sites/AdminSite";
import { EmpireSite, NewsSite, RegistrySite, StubSite } from "./sites/InfoSites";

function NavBtn({
  title,
  onClick,
  disabled,
  children,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className="flex h-8 w-8 shrink-0 items-center justify-center border border-[var(--line)] text-[var(--txt2)] transition-all hover:border-[var(--brass)] hover:text-[var(--brass2)] disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}

export default function Browser({ user, onLogout }: { user: User; onLogout: () => void }) {
  const db = useDB();
  const [stack, setStack] = useState<string[]>(["portal.arg"]);
  const [idx, setIdx] = useState(0);
  const [addr, setAddr] = useState("portal.arg");
  const [reloadKey, setReloadKey] = useState(0);
  const [lat, setLat] = useState(21);
  const [now, setNow] = useState(() => new Date());
  const mainRef = useRef<HTMLElement>(null);

  const url = stack[idx];
  const domain = findDomain(url);

  const navigate = (to: string) => {
    const host = resolveHost(to);
    setAddr(host);
    const ns = [...stack.slice(0, idx + 1), host];
    setStack(ns);
    setIdx(ns.length - 1);
    setReloadKey((k) => k + 1);
  };

  const back = () => {
    if (idx > 0) {
      setIdx(idx - 1);
      setAddr(stack[idx - 1]);
      setReloadKey((k) => k + 1);
    }
  };
  const forward = () => {
    if (idx < stack.length - 1) {
      setIdx(idx + 1);
      setAddr(stack[idx + 1]);
      setReloadKey((k) => k + 1);
    }
  };

  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);
  useEffect(() => {
    const iv = setInterval(() => setLat(14 + Math.floor(Math.random() * 22)), 2400);
    return () => clearInterval(iv);
  }, []);
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [url, reloadKey]);

  const bookmarks = db.domains.filter((d) => d.system && (d.kind !== "admin" || user.role === "admin"));

  let content: React.ReactNode;
  if (!domain) {
    content = <NotFound host={url} nav={navigate} />;
  } else {
    switch (domain.kind) {
      case "portal":
        content = <PortalSite user={user} nav={navigate} />;
        break;
      case "mail":
        content = <MailSite user={user} />;
        break;
      case "voip":
        content = <VoipSite user={user} />;
        break;
      case "news":
        content = <NewsSite />;
        break;
      case "empire":
        content = <EmpireSite nav={navigate} />;
        break;
      case "registry":
        content = <RegistrySite user={user} nav={navigate} />;
        break;
      case "admin":
        content = user.role === "admin" ? <AdminSite user={user} nav={navigate} /> : <Forbidden nav={navigate} />;
        break;
      default:
        content = (
          <StubSite name={domainFull(domain)} desc={domain.desc} owner={domain.owner} nav={navigate} />
        );
    }
  }

  return (
    <div className="flex h-screen flex-col">
      {/* хром */}
      <header className="shrink-0 border-b border-[var(--line)] bg-[rgba(13,22,18,.88)] backdrop-blur-sm">
        <div className="flex items-center gap-2 px-3 py-2">
          <Emblem size={26} className="hidden shrink-0 sm:block" />
          <span className="display hidden text-[13px] tracking-[0.2em] text-[var(--brass2)] lg:block">АРГОНЕТ</span>
          <span className="mx-1 hidden h-6 w-px bg-[var(--line)] sm:block" />

          <NavBtn title="Назад" onClick={back} disabled={idx === 0}>
            <IcArrowL size={15} />
          </NavBtn>
          <NavBtn title="Вперёд" onClick={forward} disabled={idx === stack.length - 1}>
            <IcArrowR size={15} />
          </NavBtn>
          <NavBtn title="Портал (домой)" onClick={() => navigate("portal.arg")}>
            <IcHome size={15} />
          </NavBtn>
          <NavBtn title="Обновить узел" onClick={() => setReloadKey((k) => k + 1)}>
            <IcRefresh size={14} />
          </NavBtn>

          <form
            className="flex h-9 min-w-0 flex-1 items-center gap-2 border border-[var(--line)] bg-[rgba(10,17,14,.85)] px-3 transition-colors focus-within:border-[var(--brass)]"
            onSubmit={(e) => {
              e.preventDefault();
              navigate(addr);
            }}
          >
            <IcLock size={13} className="shrink-0 text-[var(--verd)]" />
            <input
              value={addr}
              onChange={(e) => setAddr(e.target.value)}
              onFocus={(e) => e.target.select()}
              className="mono min-w-0 flex-1 bg-transparent text-[13px] text-[var(--txt)] outline-none"
              spellCheck={false}
            />
            {domain ? (
              <span className={`chip ${domain.tld === "arg" ? "chip-arg" : "chip-anct"}`}>{domain.tld}</span>
            ) : addr.includes(".") ? (
              <span className="chip chip-red">вне реестра</span>
            ) : null}
          </form>

          <span className="mono hidden shrink-0 text-[11px] text-[var(--txt2)] xl:block">
            {now.toLocaleTimeString("ru-RU")}
          </span>
          <span className="mono hidden shrink-0 border border-[var(--line)] px-2 py-0.5 text-[10px] text-[var(--txt2)] md:block">
            {lat} мс
          </span>
          <span className="mono hidden shrink-0 items-center gap-2 text-[10px] tracking-[0.15em] text-[var(--verd2)] sm:flex">
            <span className="dot-live h-1.5 w-1.5 rounded-full bg-[var(--verd)]" /> В СЕТИ
          </span>
          <span className="flex shrink-0 items-center gap-2 border border-[var(--line)] py-1 pl-1.5 pr-2">
            <SiteMark label={user.name[0]} hue="var(--brass)" size={22} />
            <span className="hidden text-[12px] font-semibold xl:block">{user.login}</span>
            <span className={`chip hidden ${user.role === "admin" ? "chip-arg" : "chip-anct"} lg:block`}>
              {user.role === "admin" ? "админ" : "подд."}
            </span>
          </span>
          <NavBtn title="Выйти из сети" onClick={onLogout}>
            <IcPower size={15} />
          </NavBtn>
        </div>

        <div className="flex gap-1 overflow-x-auto border-t border-[var(--line)] px-3 py-1">
          {bookmarks.map((d) => {
            const host = domainFull(d);
            const active = url === host;
            return (
              <button
                key={host}
                onClick={() => navigate(host)}
                className={`mono flex shrink-0 items-center gap-1.5 px-2 py-1 text-[11px] transition-all ${
                  active
                    ? "bg-[rgba(201,163,92,.1)] text-[var(--brass2)]"
                    : "text-[var(--txt2)] hover:bg-[rgba(233,226,208,.04)] hover:text-[var(--txt)]"
                }`}
              >
                <SiteMark label={KIND_LETTER[d.kind]} hue={d.tld === "arg" ? "var(--brass)" : "var(--verd)"} size={16} />
                {d.name}
              </button>
            );
          })}
        </div>
      </header>

      {/* содержимое узла */}
      <main ref={mainRef} className="min-h-0 flex-1 overflow-y-auto">
        <div key={`${url}:${reloadKey}`} className="siteIn h-full">
          {content}
        </div>
      </main>

      {/* строка состояния */}
      <footer className="mono flex shrink-0 items-center justify-between gap-3 border-t border-[var(--line)] bg-[rgba(13,22,18,.88)] px-3 py-1 text-[10px] text-[var(--dim)]">
        <span className="flex min-w-0 items-center gap-1.5 truncate">
          <IcLock size={10} className="shrink-0 text-[var(--verd)]" />
          <span className="truncate">{url}</span>
          <span className="hidden sm:inline">• канал устойчив</span>
        </span>
        <span className="hidden md:block">узел 01-столица • пинг {lat} мс • шифр АРГ-256</span>
        <span>
          сеанс: {user.login} • {now.toLocaleTimeString("ru-RU")}
        </span>
      </footer>
    </div>
  );
}

/* ---------- служебные страницы ---------- */

function NotFound({ host, nav }: { host: string; nav: (h: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-5 py-16 text-center">
      <IcWarn size={40} className="text-[var(--signal)]" />
      <h1 className="display mt-5 text-3xl tracking-wide sm:text-4xl">УЗЕЛ НЕ НАЙДЕН</h1>
      <p className="mono mt-3 border border-[rgba(198,90,69,.4)] bg-[rgba(198,90,69,.07)] px-3 py-1.5 text-[12px] text-[var(--signal2)]">
        {host} — в имперском реестре такого имени нет
      </p>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-[var(--txt2)]">
        Возможно, имя ещё не жаловано, либо домен отозван указом. Проверьте реестр — или подайте прошение
        через Имперскую канцелярию.
      </p>
      <div className="mt-6 flex gap-2">
        <button className="btn" onClick={() => nav("registr.arg")}>
          Открыть реестр
        </button>
        <button className="btn btn-brass" onClick={() => nav("portal.arg")}>
          На портал
        </button>
      </div>
    </div>
  );
}

function Forbidden({ nav }: { nav: (h: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-5 py-16 text-center">
      <IcBan size={40} className="text-[var(--signal)]" />
      <h1 className="display mt-5 text-3xl tracking-wide sm:text-4xl">ДОСТУП ЗАПРЕЩЁН</h1>
      <p className="mono mt-3 text-[11px] tracking-[0.2em] text-[var(--txt2)]">
        УПРАВЛЕНИЕ.ARG ВЕДАЕТ ИМПЕРСКАЯ КАНЦЕЛЯРИЯ
      </p>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-[var(--txt2)]">
        Этот узел требует статуса администратора. Ваш сеанс записан в журнал сети — Канцелярия уже знает о
        вашем любопытстве.
      </p>
      <button className="btn mt-6" onClick={() => nav("portal.arg")}>
        Вернуться на портал
      </button>
    </div>
  );
}

/* ---------- тосты ---------- */

export function ToastHost() {
  const [items, setItems] = useState<ToastMsg[]>([]);

  useEffect(
    () =>
      onToast((t) => {
        setItems((xs) => [...xs.slice(-3), t]);
        setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== t.id)), 3400);
      }),
    []
  );

  const color = (k: ToastMsg["kind"]) =>
    k === "ok" ? "var(--verd)" : k === "err" ? "var(--signal)" : "var(--brass)";

  return (
    <div className="pointer-events-none fixed right-4 top-16 z-[70] flex w-80 flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className="fadeUp panel px-4 py-3 text-[12.5px] text-[var(--txt)] shadow-lg"
          style={{ borderLeft: `3px solid ${color(t.kind)}` }}
        >
          <span className="mono mr-2 text-[10px] tracking-[0.2em]" style={{ color: color(t.kind) }}>
            {t.kind === "ok" ? "УЗЕЛ" : t.kind === "err" ? "ОТКАЗ" : "СЕТЬ"}
          </span>
          {t.text}
        </div>
      ))}
    </div>
  );
}
