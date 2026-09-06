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
  [40, 30], [70, 112], [228, 24], [264, 96], [112, 18], [198, 130], [28, 76], [272, 52],
];

export default function KrgSite({ user, nav, mirror }: { user: User; nav: (h: string) => void; mirror?: boolean }) {
  const db = useDB();
  const [q, setQ] = useState("");

  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return null;
    return db.domains.filter(
      (d) =>
        (d.kind !== "admin" || user.role === "root" || user.role === "operator") &&
        (d.kind !== "monitor" || user.role === "root" || user.role === "tech") &&
        (domainFull(d).includes(s) || d.desc.toLowerCase().includes(s))
    );
  }, [q, db.domains, user.role]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (matches && matches.length > 0) nav(domainFull(matches[0]));
    else if (q.trim()) nav(q.trim());
    else toast("Введите имя узла ARG-Net", "info");
  };

  const nDomains = useCountUp(db.domains.length);
  const nUsers = useCountUp(db.users.length);
  const nTx = useCountUp(db.tx.length);
  const uptime = Math.floor((Date.now() - NET_EPOCH) / 86_400_000);

  const visible = db.domains.filter(
    (d) =>
      d.kind !== "service" &&
      (d.kind !== "admin" || user.role === "root" || user.role === "operator") &&
      (d.kind !== "monitor" || user.role === "root" || user.role === "tech")
  );
  const dateLine = new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      {mirror && (
        <div className="mono mb-5 border border-[var(--line2)] bg-[rgba(212,175,55,.05)] px-4 py-2.5 text-[10.5px] tracking-[0.18em] text-[var(--txt2)]">
          KOLLĘGĘN.ARG — АЛЬТЕРНАТИВНЫЙ ДОМЕН КОЛЛЕГИЙ • ЗЕРКАЛО УЗЛА KRG.ARG (ПОРТ 8010)
        </div>
      )}

      <div className="fadeUp">
        <p className="mono text-[10px] tracking-[0.3em] text-[var(--dim)]">
          УНИВЕРСАЛЬНЫЙ ПОРТАЛ КОЛЛЕГИЙ • KRG.ARG • ПОРТ 8009
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <h1 className="display text-3xl font-extrabold tracking-wide sm:text-[40px]">
            ЕГИКС <span className="text-[var(--gold)]">ARG-NET</span>
          </h1>
          <div className="mono text-right text-[11px] leading-5 text-[var(--txt2)]">
            <div>{dateLine}</div>
            <div className="text-[var(--dim)]">сеть несёт службу {uptime}-й день</div>
          </div>
        </div>
        <div className="goldline mt-5" />
      </div>

      <form onSubmit={submitSearch} className="fadeUp panel mt-7 flex items-center gap-3 px-4 focus-within:border-[var(--gold)]" style={{ animationDelay: "60ms" }}>
        <IcSearch size={18} className="shrink-0 text-[var(--gold)]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Узел сети: post, call, sb, kustos… или полный домен"
          className="mono h-12 w-full bg-transparent text-sm outline-none placeholder:text-[var(--dim)]"
        />
        <span className="chip hidden sm:block">ENTER</span>
      </form>

      {matches && (
        <div className="panel mt-2 divide-y divide-[var(--line)]">
          {matches.length === 0 && (
            <p className="mono px-4 py-3 text-[12px] text-[var(--dim)]">В реестре такого имени нет — будет показан ответ NXDOMAIN.</p>
          )}
          {matches.slice(0, 6).map((d) => (
            <button key={domainFull(d)} onClick={() => nav(domainFull(d))} className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[rgba(212,175,55,.05)]">
              <SiteMark label={KIND_LETTER[d.kind]} hue={d.tld === "arg" ? "var(--gold)" : "var(--red3)"} size={26} />
              <span className="mono text-sm text-[var(--txt)]">{domainFull(d)}</span>
              <span className="mono text-[10px] text-[var(--dim)]">:{d.port}</span>
              <span className="hidden flex-1 truncate text-xs text-[var(--txt2)] sm:block">{d.desc}</span>
              <IcArrowR size={14} className="ml-auto shrink-0 text-[var(--dim)]" />
            </button>
          ))}
        </div>
      )}

      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { v: nDomains, l: "доменов в реестре" },
          { v: nUsers, l: "Iŧirinio в реестре" },
          { v: nTx, l: "транзакций e-T" },
          { v: uptime, l: "дней беспорочной службы" },
        ].map((s, i) => (
          <div key={s.l} className="fadeUp panel p-4" style={{ animationDelay: `${100 + i * 60}ms` }}>
            <div className="display text-3xl font-extrabold text-[var(--gold2)]">{s.v}</div>
            <div className="mono mt-1 text-[10px] uppercase tracking-[0.18em] text-[var(--dim)]">{s.l}</div>
          </div>
        ))}
      </div>

      <h2 className="display mt-10 text-lg font-bold tracking-wider">РЕЕСТР УЗЛОВ ARG-NET</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((d, i) => (
          <button
            key={domainFull(d)}
            onClick={() => nav(domainFull(d))}
            className="fadeUp group panel p-4 text-left transition-all hover:-translate-y-1 hover:border-[var(--gold)]"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="flex items-center gap-3">
              <SiteMark label={KIND_LETTER[d.kind]} hue={d.tld === "arg" ? "var(--gold)" : "var(--red3)"} size={38} />
              <div className="min-w-0">
                <div className="display truncate text-[15px] font-extrabold uppercase tracking-wide transition-colors group-hover:text-[var(--gold2)]">
                  {d.name}
                </div>
                <div className={`mono text-[11px] ${d.tld === "arg" ? "text-[var(--gold)]" : "text-[var(--red3)]"}`}>
                  {domainFull(d)} <span className="text-[var(--dim)]">:{d.port}</span>
                </div>
              </div>
              <span className={`chip ml-auto ${d.tld === "arg" ? "chip-gold" : "chip-red"}`}>{d.tld}</span>
            </div>
            <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-[var(--txt2)]">{d.desc}</p>
          </button>
        ))}
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="panel p-5">
          <div className="flex items-center justify-between">
            <h3 className="display text-sm font-bold tracking-wider">ВЕСТИ КОЛЛЕГИЙ</h3>
            <span className="chip chip-gold">krg.arg/вести</span>
          </div>
          <div className="mt-1">
            {db.news.slice(0, 4).map((n, i) => (
              <div key={n.id} className="fadeUp group border-b border-[var(--line)] py-3 last:border-0" style={{ animationDelay: `${i * 70}ms` }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="chip">{n.tag}</span>
                      <span className="text-sm font-semibold text-[var(--txt)]">{n.title}</span>
                    </div>
                    <div className="mt-1 line-clamp-1 text-xs text-[var(--txt2)]">{n.lead}</div>
                  </div>
                  <span className="mono shrink-0 pt-1 text-[10px] text-[var(--dim)]">{n.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="panel p-5">
            <div className="flex items-center gap-2">
              <IcCrown size={18} className="text-[var(--gold)]" />
              <h3 className="display text-sm font-bold tracking-wider">МАНИФЕСТ ДНЯ</h3>
            </div>
            <p className="mt-3 text-sm font-semibold">О провозглашении Аргской Империи</p>
            <p className="mt-1.5 text-xs leading-relaxed text-[var(--txt2)]">
              Государство преобразовано в Империю; все прежние королевские наименования в ЕГИКС заменяются
              имперскими. Исторические аббревиатуры служб (ГИКС, КЭП) сохранены.
            </p>
            <p className="mono mt-3 text-[10px] tracking-[0.18em] text-[var(--dim)]">Е.И.В. ИМПЕРАТОР АРГОЛЬД IV • ПОДПИСАНО ПЕЧАТЬЮ</p>
          </div>

          <div className="panel p-5">
            <div className="flex items-center justify-between">
              <h3 className="mono text-[10px] tracking-[0.25em] text-[var(--dim)]">СХЕМА СЕТИ • СЛУЖБЫ 8000–8010</h3>
              <span className="mono flex items-center gap-1.5 text-[10px] text-[var(--gold2)]">
                <span className="dot-live inline-block h-1.5 w-1.5 rounded-full bg-[var(--gold)]" /> В СТРОЮ
              </span>
            </div>
            <svg viewBox="0 0 300 150" className="mt-2 w-full">
              {MAP_NODES.map(([x, y], i) => (
                <line key={i} x1={150} y1={75} x2={x} y2={y} stroke="var(--line2)" strokeWidth="1" />
              ))}
              {MAP_NODES.map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 4 : 3} className="nblink" style={{ fill: i % 2 ? "var(--red3)" : "var(--gold)", animationDelay: `${i * 0.35}s` }} />
              ))}
              <circle cx={150} cy={75} r={8} fill="rgba(139,0,0,.2)" stroke="var(--gold)" strokeWidth="1.4" />
              <text x={150} y={78.5} textAnchor="middle" fontFamily="'IBM Plex Mono'" fontSize="8" style={{ fill: "var(--gold2)" }}>01</text>
            </svg>
            <p className="mono mt-1 text-[10px] text-[var(--dim)]">задержка до gnicst.anct: 11 мс • резерв через Южный тракт</p>
          </div>
        </div>
      </div>

      <div className="mono mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] pt-4 text-[9.5px] tracking-[0.2em] text-[var(--dim)]">
        <span>ЕГИКС ARG-NET • СОБСТВЕННОСТЬ АРГСКОЙ ИМПЕРИИ</span>
        <span>СЕАНС: {user.itirinio} • ПРОТОТИП (ДАННЫЕ В БРАУЗЕРЕ)</span>
      </div>
    </div>
  );
}
