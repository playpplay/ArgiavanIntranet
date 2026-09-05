import { useEffect, useMemo, useState } from "react";
import {
  useDB,
  domainFull,
  KIND_LETTER,
  NET_EPOCH,
  toast,
  type User,
} from "../../lib/db";
import { IcArrowR, IcCrown, IcSearch, SiteMark } from "../../lib/icons";

function useCountUp(target: number) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 800);
      setN(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return n;
}

const MAP_NODES: Array<[number, number]> = [
  [40, 30],
  [70, 112],
  [228, 24],
  [264, 96],
  [112, 18],
  [198, 130],
  [28, 76],
  [272, 52],
];

export default function PortalSite({ user, nav }: { user: User; nav: (h: string) => void }) {
  const db = useDB();
  const [q, setQ] = useState("");

  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return null;
    return db.domains.filter(
      (d) =>
        (d.kind !== "admin" || user.role === "admin") &&
        (domainFull(d).includes(s) || d.desc.toLowerCase().includes(s))
    );
  }, [q, db.domains, user.role]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (matches && matches.length > 0) nav(domainFull(matches[0]));
    else if (q.trim()) nav(q.trim());
    else toast("Введите имя узла, подданный", "info");
  };

  const nDomains = useCountUp(db.domains.length);
  const nUsers = useCountUp(db.users.length);
  const nMail = useCountUp(db.emails.length);
  const uptime = Math.floor((Date.now() - NET_EPOCH) / 86_400_000);

  const visible = db.domains.filter((d) => d.kind !== "admin" || user.role === "admin");
  const dateLine = new Date().toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      {/* шапка */}
      <div className="fadeUp">
        <p className="mono text-[10px] tracking-[0.3em] text-[var(--dim)]">
          СЕТЕВОЙ УЗЕЛ PORTAL.ARG — ВХОДНЫЕ ВРАТА
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <h1 className="display text-4xl tracking-wide text-[var(--txt)] sm:text-5xl">
            ПОРТАЛ <span className="text-[var(--brass)]">АРГОНЕТ</span>
          </h1>
          <div className="mono text-right text-[11px] leading-5 text-[var(--txt2)]">
            <div>{dateLine}</div>
            <div className="text-[var(--dim)]">сеть несёт службу {uptime}-й день</div>
          </div>
        </div>
      </div>

      {/* поиск по сети */}
      <form onSubmit={submitSearch} className="fadeUp panel mt-8 flex items-center gap-3 px-4 py-1 focus-within:border-[var(--brass)]" style={{ animationDelay: "60ms" }}>
        <IcSearch size={18} className="shrink-0 text-[var(--brass)]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Найти узел: pochta, zvonok, vesti… или введите домен"
          className="mono h-12 w-full bg-transparent text-sm outline-none placeholder:text-[var(--dim)]"
        />
        <span className="chip hidden sm:block">ENTER</span>
      </form>

      {matches && (
        <div className="panel mt-2 divide-y divide-[var(--line)]">
          {matches.length === 0 && (
            <p className="mono px-4 py-3 text-[12px] text-[var(--dim)]">
              В реестре такого имени нет — будет показана страница «узел не найден».
            </p>
          )}
          {matches.slice(0, 6).map((d) => (
            <button
              key={domainFull(d)}
              onClick={() => nav(domainFull(d))}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[rgba(201,163,92,.06)]"
            >
              <SiteMark label={KIND_LETTER[d.kind]} hue={d.tld === "arg" ? "var(--brass)" : "var(--verd)"} size={26} />
              <span className="mono text-sm text-[var(--txt)]">{domainFull(d)}</span>
              <span className="hidden text-xs text-[var(--txt2)] sm:block">{d.desc}</span>
              <IcArrowR size={14} className="ml-auto text-[var(--dim)]" />
            </button>
          ))}
        </div>
      )}

      {/* сводка */}
      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { v: nDomains, l: "доменов в реестре" },
          { v: nUsers, l: "подданных в сети" },
          { v: nMail, l: "депеш в почтовой службе" },
          { v: uptime, l: "дней беспорочной службы" },
        ].map((s, i) => (
          <div key={s.l} className="fadeUp panel p-4" style={{ animationDelay: `${100 + i * 60}ms` }}>
            <div className="display text-3xl text-[var(--brass2)]">{s.v}</div>
            <div className="mono mt-1 text-[10px] uppercase tracking-[0.18em] text-[var(--dim)]">{s.l}</div>
          </div>
        ))}
      </div>

      {/* реестр узлов */}
      <div className="mt-10 flex items-end justify-between">
        <h2 className="display text-lg tracking-wider text-[var(--txt)]">РЕЕСТР УЗЛОВ</h2>
        <button
          onClick={() => nav("registr.arg")}
          className="mono flex items-center gap-1 text-[11px] tracking-[0.15em] text-[var(--brass)] transition-colors hover:text-[var(--brass2)]"
        >
          ПОЛНЫЙ РЕЕСТР <IcArrowR size={13} />
        </button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((d, i) => (
          <button
            key={domainFull(d)}
            onClick={() => nav(domainFull(d))}
            className="fadeUp group panel p-4 text-left transition-all hover:-translate-y-1 hover:border-[var(--brass)]"
            style={{ animationDelay: `${i * 55}ms` }}
          >
            <div className="flex items-center gap-3">
              <SiteMark label={KIND_LETTER[d.kind]} hue={d.tld === "arg" ? "var(--brass)" : "var(--verd)"} size={38} />
              <div className="min-w-0">
                <div className="display truncate text-[14px] uppercase tracking-wide text-[var(--txt)] transition-colors group-hover:text-[var(--brass2)]">
                  {d.name}
                </div>
                <div className={`mono text-[11px] ${d.tld === "arg" ? "text-[var(--brass)]" : "text-[var(--verd)]"}`}>
                  {domainFull(d)}
                </div>
              </div>
              <span className={`chip ml-auto ${d.tld === "arg" ? "chip-arg" : "chip-anct"}`}>{d.tld}</span>
            </div>
            <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-[var(--txt2)]">{d.desc}</p>
          </button>
        ))}
      </div>

      {/* вести + указ + схема */}
      <div className="mt-10 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="panel p-5">
          <div className="flex items-center justify-between">
            <h3 className="display text-sm tracking-wider text-[var(--txt)]">АРГТАГРАФ — ПОСЛЕДНИЕ ВЕСТИ</h3>
            <span className="chip chip-anct">вести.anct</span>
          </div>
          <div className="mt-2">
            {db.news.slice(0, 4).map((n, i) => (
              <button
                key={n.id}
                onClick={() => nav("vesti.anct")}
                className="fadeUp group flex w-full items-start justify-between gap-4 border-b border-[var(--line)] py-3 text-left last:border-0"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <div>
                  <div className="text-sm font-semibold transition-colors group-hover:text-[var(--brass2)]">
                    {n.title}
                  </div>
                  <div className="mt-0.5 line-clamp-1 text-xs text-[var(--txt2)]">{n.lead}</div>
                </div>
                <span className="mono shrink-0 pt-0.5 text-[10px] text-[var(--dim)]">{n.date}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => nav("vesti.anct")}
            className="mono mt-3 flex items-center gap-1 text-[11px] tracking-[0.15em] text-[var(--brass)] transition-colors hover:text-[var(--brass2)]"
          >
            ВСЕ ВЕСТИ <IcArrowR size={13} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="panel p-5">
            <div className="flex items-center gap-2">
              <IcCrown size={18} className="text-[var(--brass)]" />
              <h3 className="display text-sm tracking-wider">УКАЗ ДНЯ</h3>
            </div>
            <p className="mt-3 text-sm font-semibold">№17 — о едином адресном пространстве</p>
            <p className="mt-1.5 text-xs leading-relaxed text-[var(--txt2)]">
              Зона .arg жалована учреждениям Империи, зона .anct открыта службам и подданным. Реестр ведёт
              Имперская канцелярия.
            </p>
            <button
              onClick={() => nav("imperiya.arg")}
              className="mono mt-3 flex items-center gap-1 text-[11px] tracking-[0.15em] text-[var(--brass)] transition-colors hover:text-[var(--brass2)]"
            >
              НА УЗЛЕ IMPERIYA.ARG <IcArrowR size={13} />
            </button>
          </div>

          <div className="panel p-5">
            <div className="flex items-center justify-between">
              <h3 className="mono text-[10px] tracking-[0.25em] text-[var(--dim)]">СХЕМА СЕТИ — 12 УЗЛОВ</h3>
              <span className="flex items-center gap-1.5 mono text-[10px] text-[var(--verd2)]">
                <span className="dot-live inline-block h-1.5 w-1.5 rounded-full bg-[var(--verd)]" /> ЖИВА
              </span>
            </div>
            <svg viewBox="0 0 300 150" className="mt-2 w-full">
              {MAP_NODES.map(([x, y], i) => (
                <line key={i} x1={150} y1={75} x2={x} y2={y} stroke="var(--line2)" strokeWidth="1" />
              ))}
              {MAP_NODES.map(([x, y], i) => (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={i % 3 === 0 ? 4 : 3}
                  className="nblink"
                  style={{ fill: i % 2 ? "var(--verd)" : "var(--brass)", animationDelay: `${i * 0.35}s` }}
                />
              ))}
              <circle cx={150} cy={75} r={8} fill="rgba(201,163,92,.15)" stroke="var(--brass)" strokeWidth="1.4" />
              <text x={150} y={79} textAnchor="middle" fontFamily="'IBM Plex Mono'" fontSize="9" style={{ fill: "var(--brass2)" }}>
                01
              </text>
            </svg>
            <p className="mono mt-1 text-[10px] text-[var(--dim)]">задержка до узла 07: 14 мс • резерв через Южный тракт</p>
          </div>
        </div>
      </div>

      <div className="mono mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] pt-4 text-[10px] tracking-[0.2em] text-[var(--dim)]">
        <span>АРГОНЕТ • ВНУТРЕННЯЯ СЕТЬ ИМПЕРИИ</span>
        <span>СЕАНС: {user.login.toUpperCase()} • ПРОТОТИП, ДАННЫЕ В ВАШЕМ БРАУЗЕРЕ</span>
      </div>
    </div>
  );
}
