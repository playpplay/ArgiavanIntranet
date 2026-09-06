import { useMemo, useState } from "react";
import { useDB, domainFull, KIND_LABEL, KIND_LETTER, type Domain, type User } from "../../lib/db";
import { Emblem, IcArrowR, IcSearch, SiteMark } from "../../lib/icons";

export default function KrgSite({ user, nav, mirror }: { user: User; nav: (h: string) => void; mirror?: boolean }) {
  const db = useDB();
  const [q, setQ] = useState("");

  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return null;
    return db.domains.filter(
      (d) =>
        (d.kind !== "admin" || user.role === "root" || user.role === "operator") &&
        (domainFull(d).includes(s) || d.desc.toLowerCase().includes(s))
    );
  }, [q, db.domains, user.role]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (matches && matches.length > 0) nav(domainFull(matches[0]));
    else if (q.trim()) nav(q.trim());
  };

  const visible = db.domains.filter((d) => d.kind !== "admin" || user.role === "root" || user.role === "operator");

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      {/* заголовок */}
      <div className="fadeUp flex items-end justify-between gap-6">
        <div>
          <p className="mono text-[10px] tracking-[0.3em] text-[var(--dim)]">
            {mirror ? "ЗЕРКАЛО ПОРТАЛА • KOLLĘGĘN.ARG : 8010" : "УНИВЕРСАЛЬНЫЙ ПОРТАЛ • KRG.ARG : 8009"}
          </p>
          <h1 className="display mt-2 text-4xl font-extrabold tracking-wide sm:text-5xl">
            ПОРТАЛ <span className="text-[var(--gold)]">КОЛЛЕГИЙ</span>
          </h1>
        </div>
        <Emblem size={72} className="hidden shrink-0 sm:block" />
      </div>
      <div className="goldline mt-5" />

      {/* поиск */}
      <form
        onSubmit={submit}
        className="fadeUp panel mt-8 flex items-center gap-3 px-4 focus-within:border-[var(--gold)]"
        style={{ animationDelay: "80ms" }}
      >
        <IcSearch size={18} className="shrink-0 text-[var(--gold)]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск по сети: имя узла или домен (post, call.arg, sb…)"
          className="mono h-13 w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-[var(--dim)]"
        />
        <button type="submit" className="chip chip-gold shrink-0 border-0 bg-[rgba(212,175,55,.12)]">
          НАЙТИ
        </button>
      </form>

      {matches && (
        <div className="panel mt-2 divide-y divide-[var(--line)]">
          {matches.length === 0 && (
            <p className="mono px-4 py-3 text-[12px] text-[var(--dim)]">
              В Государственном реестре такого имени нет — будет показан ответ DNS: NXDOMAIN.
            </p>
          )}
          {matches.slice(0, 6).map((d) => (
            <button
              key={domainFull(d)}
              onClick={() => nav(domainFull(d))}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[rgba(212,175,55,.05)]"
            >
              <SiteMark label={KIND_LETTER[d.kind]} hue={d.tld === "arg" ? "var(--gold)" : "var(--red3)"} size={26} />
              <span className="mono text-sm text-[var(--txt)]">{domainFull(d)}</span>
              <span className="hidden text-xs text-[var(--txt2)] sm:block">{KIND_LABEL[d.kind]}</span>
              <IcArrowR size={14} className="ml-auto text-[var(--dim)]" />
            </button>
          ))}
        </div>
      )}

      {/* реестр узлов */}
      <div className="mt-10 flex items-end justify-between">
        <h2 className="display text-lg font-bold tracking-wider">ГОСУДАРСТВЕННЫЙ РЕЕСТР УЗЛОВ</h2>
        <span className="mono text-[10px] tracking-[0.2em] text-[var(--dim)]">ЗОНЫ: {db.zones.map((z) => "." + z.tld).join(" • ")}</span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {visible.map((d, i) => (
          <DomainCard key={domainFull(d)} d={d} nav={nav} delay={i * 50} />
        ))}
      </div>

      <div className="mono mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] pt-4 text-[10px] tracking-[0.2em] text-[var(--dim)]">
        <span>ЕГИКС ARG-NET • СОБСТВЕННОСТЬ ИМПЕРИИ АРГИЯ</span>
        <span>СЕАНС: {user.login.toUpperCase()}</span>
      </div>
    </div>
  );
}

function DomainCard({ d, nav, delay }: { d: Domain; nav: (h: string) => void; delay: number }) {
  const up = d.hosted && d.kind !== "reserved";
  return (
    <button
      onClick={() => nav(domainFull(d))}
      className="fadeUp group panel p-4 text-left transition-all hover:-translate-y-0.5 hover:border-[var(--gold)]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-3">
        <SiteMark label={KIND_LETTER[d.kind]} hue={d.tld === "arg" ? "var(--gold)" : "var(--red3)"} size={36} />
        <div className="min-w-0 flex-1">
          <div className="display truncate text-[14px] font-bold uppercase tracking-wide transition-colors group-hover:text-[var(--gold2)]">
            {domainFull(d)}
          </div>
          <div className="mono text-[10.5px] text-[var(--dim)]">
            {KIND_LABEL[d.kind]} • порт {d.port}
            {d.mirror && " • зеркало"}
          </div>
        </div>
        <span className={`chip shrink-0 ${d.tld === "arg" ? "chip-gold" : "chip-red"}`}>.{d.tld}</span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="line-clamp-1 text-xs text-[var(--txt2)]">{d.desc}</p>
        {up ? (
          <span className="mono flex shrink-0 items-center gap-1.5 text-[9.5px] tracking-[0.15em] text-[var(--gold2)]">
            <span className="dot-live inline-block h-1.5 w-1.5 rounded-full bg-[var(--gold)]" /> В СТРОЮ
          </span>
        ) : (
          <span className="mono flex shrink-0 items-center gap-1.5 text-[9.5px] tracking-[0.15em] text-[var(--dim)]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--line2)]" /> СЛУЖБА НЕ ПОДНЯТА
          </span>
        )}
      </div>
    </button>
  );
}
