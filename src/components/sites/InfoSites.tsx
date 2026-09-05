import { useState } from "react";
import { useDB, domainFull, KIND_LABEL, fmtDate, type User } from "../../lib/db";
import { Emblem, IcChevD, IcCrown, IcDoc, IcGlobe, IcShield } from "../../lib/icons";

/* ================= imperiya.arg ================= */

const LAWS = [
  {
    n: "01",
    t: "О подданстве в сети",
    d: "Доступ в Аргонет жалует Имперская канцелярия по паролю. Передача пароля приравнивается к передаче ключей от крепости.",
  },
  {
    n: "02",
    t: "Об адресном пространстве",
    d: "Зона .arg — учреждения Империи, зона .anct — службы и подданные. Имена жалуются по праву первенства прошения.",
  },
  {
    n: "03",
    t: "О тайне переписки",
    d: "Депеши подданных тайны. Чтение чужих депеш карается отключением от сети на срок до одной луны.",
  },
];

const DECREES = [
  {
    id: "d17",
    title: "Указ №17 — о едином адресном пространстве",
    date: "3 дня назад",
    text: "ПОВЕЛЕВАЮ: 1) Зону .arg утвердить за учреждениями государственными. 2) Зону .anct — Аргскую Народную Цифровую Территорию — открыть для служб и подданных. 3) Реестр доменов вести в Имперской канцелярии, самовольное захватничество имён пресекать. Подписано электронной печатью Империи.",
  },
  {
    id: "d7",
    title: "Указ №7 — о паролях и ключах",
    date: "луна назад",
    text: "ПОВЕЛЕВАЮ: пароли подданных хранить в hashed-виде (bcrypt), длиной не менее шести знаков. Ключи выдаёт Канцелярия лично в руки или депешей с грифом. Утеря ключа докладывается смотрителю узла в тот же день.",
  },
  {
    id: "d3",
    title: "Указ №3 — о тайне переписки",
    date: "две луны назад",
    text: "ПОВЕЛЕВАЮ: почту подданных считать тайной. Прослушивание Аргфона без соизволения Государя — государственная измена. Смотрители узлов клянутся на Уложении беречь тайну.",
  },
];

export function EmpireSite({ nav }: { nav: (h: string) => void }) {
  const [open, setOpen] = useState<string | null>("d17");
  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <div className="fadeUp flex flex-col items-center text-center">
        <Emblem size={110} />
        <h1 className="display mt-5 text-3xl tracking-wide sm:text-4xl">АРГСКАЯ ИМПЕРИЯ</h1>
        <p className="mono mt-2 text-[10px] tracking-[0.3em] text-[var(--txt2)]">
          ОФИЦИАЛЬНЫЙ УЗЕЛ • IMPERIYA.ARG
        </p>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--txt2)]">
          Империя держится не одной лишь силой оружия, но и силой связи. Аргонет — кровеносная система
          державы: всякое слово подданного доходит до столицы за мгновение.
        </p>
      </div>

      <div className="mt-10 grid gap-3 sm:grid-cols-3">
        {LAWS.map((l, i) => (
          <div key={l.n} className="fadeUp panel p-5 transition-colors hover:border-[var(--brass)]" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="display text-2xl text-[var(--brass)]">{l.n}</div>
            <h3 className="mt-2 text-sm font-bold">{l.t}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-[var(--txt2)]">{l.d}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <div className="panel flex flex-col items-center p-5 text-center">
          <IcCrown size={22} className="text-[var(--brass)]" />
          <div className="mono mt-2 text-[10px] tracking-[0.2em] text-[var(--dim)]">ГЕРБ</div>
          <p className="mt-1 text-xs text-[var(--txt2)]">Шестигранник с литерой «А» и орбитой связной башни</p>
        </div>
        <div className="panel p-5">
          <div className="mono text-center text-[10px] tracking-[0.2em] text-[var(--dim)]">ЦВЕТА</div>
          <div className="mt-3 flex justify-center gap-2">
            <span className="h-8 w-12 border border-[var(--line2)]" style={{ background: "var(--brass)" }} title="Латунь" />
            <span className="h-8 w-12 border border-[var(--line2)]" style={{ background: "var(--verd)" }} title="Малахит" />
            <span className="h-8 w-12 border border-[var(--line2)]" style={{ background: "var(--signal)" }} title="Сигнал" />
            <span className="h-8 w-12 border border-[var(--line2)]" style={{ background: "var(--ink)" }} title="Чернь" />
          </div>
          <p className="mono mt-2 text-center text-[10px] text-[var(--txt2)]">латунь • малахит • сигнал • чернь</p>
        </div>
        <div className="panel flex flex-col items-center p-5 text-center">
          <IcShield size={22} className="text-[var(--brass)]" />
          <div className="mono mt-2 text-[10px] tracking-[0.2em] text-[var(--dim)]">ДЕВИЗ</div>
          <p className="display mt-1 text-sm tracking-wider text-[var(--brass2)]">«СВЯЗЬ — ЕСТЬ ДЕРЖАВА»</p>
        </div>
      </div>

      <h2 className="display mt-12 text-lg tracking-wider">УКАЗЫ И ПОВЕЛЕНИЯ</h2>
      <div className="mt-3 divide-y divide-[var(--line)] border-y border-[var(--line)]">
        {DECREES.map((d) => (
          <div key={d.id}>
            <button
              onClick={() => setOpen(open === d.id ? null : d.id)}
              className="flex w-full items-center gap-3 py-3.5 text-left transition-colors hover:text-[var(--brass2)]"
            >
              <IcDoc size={16} className="shrink-0 text-[var(--brass)]" />
              <span className="flex-1 text-sm font-semibold">{d.title}</span>
              <span className="mono text-[10px] text-[var(--dim)]">{d.date}</span>
              <IcChevD size={16} className={`transition-transform ${open === d.id ? "rotate-180 text-[var(--brass)]" : "text-[var(--dim)]"}`} />
            </button>
            {open === d.id && (
              <p className="siteIn pb-4 pl-9 pr-8 text-[13px] leading-6 text-[var(--txt2)]">{d.text}</p>
            )}
          </div>
        ))}
      </div>

      <div className="mono mt-8 flex justify-between border-t border-[var(--line)] pt-4 text-[10px] tracking-[0.2em] text-[var(--dim)]">
        <span>КАНЦЕЛЯРИЯ ИМПЕРИИ</span>
        <button onClick={() => nav("portal.arg")} className="text-[var(--brass)] transition-colors hover:text-[var(--brass2)]">
          ← НА ПОРТАЛ
        </button>
      </div>
    </div>
  );
}

/* ================= vesti.anct ================= */

export function NewsSite() {
  const db = useDB();
  const [open, setOpen] = useState<string | null>(db.news[0]?.id ?? null);
  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <div className="fadeUp border-b-2 border-[var(--verd)] pb-4">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="display text-3xl tracking-wide">
            АРГ<span className="text-[var(--verd)]">ТАГРАФ</span>
          </h1>
          <span className="mono text-[10px] tracking-[0.25em] text-[var(--dim)]">АГЕНТСТВО ИМПЕРСКИХ ВЕСТЕЙ • VESTI.ANCT</span>
        </div>
        <div className="mt-3 overflow-hidden">
          <div className="marquee mono text-[11px] text-[var(--txt2)]">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex shrink-0">
                {db.news.map((n) => (
                  <span key={n.id} className="flex items-center whitespace-nowrap pr-10">
                    <span className="mr-2 text-[var(--verd)]">●</span> {n.title}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {db.news.map((n, i) => (
          <article key={n.id} className="fadeUp panel p-5" style={{ animationDelay: `${i * 60}ms` }}>
            <button onClick={() => setOpen(open === n.id ? null : n.id)} className="w-full text-left">
              <div className="flex items-center gap-3">
                <span className="chip chip-anct">{n.tag}</span>
                <span className="mono text-[10px] text-[var(--dim)]">{n.date}</span>
                <IcChevD size={15} className={`ml-auto transition-transform ${open === n.id ? "rotate-180 text-[var(--verd)]" : "text-[var(--dim)]"}`} />
              </div>
              <h2 className="mt-2 text-base font-bold leading-snug transition-colors hover:text-[var(--verd2)]">{n.title}</h2>
              <p className="mt-1 text-[13px] text-[var(--txt2)]">{n.lead}</p>
            </button>
            {open === n.id && (
              <p className="siteIn mt-3 border-t border-[var(--line)] pt-3 text-[13px] leading-6 text-[var(--txt2)]">
                {n.text}
              </p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

/* ================= registr.arg ================= */

export function RegistrySite({ user, nav }: { user: User; nav: (h: string) => void }) {
  const db = useDB();
  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <div className="fadeUp flex items-center gap-3">
        <IcGlobe size={26} className="text-[var(--brass)]" />
        <div>
          <h1 className="display text-2xl tracking-wide sm:text-3xl">ИМПЕРСКИЙ РЕЕСТР ДОМЕНОВ</h1>
          <p className="mono mt-1 text-[10px] tracking-[0.25em] text-[var(--dim)]">
            REGISTR.ARG • ЛЕТОПИСЬ ВСЕХ ИМЁН АРГОНЕТА
          </p>
        </div>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <div className="fadeUp panel border-l-2 border-l-[var(--brass)] p-5">
          <div className="display text-xl text-[var(--brass2)]">.ARG</div>
          <p className="mono mt-1 text-[10px] tracking-[0.2em] text-[var(--dim)]">ГОСУДАРСТВЕННЫЙ СЕКТОР</p>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--txt2)]">
            Имена, жалованные учреждениям Империи: Канцелярия, Казна, официальные узлы. Пошлина — три
            империала в год. Самовольное захватничество пресекается.
          </p>
        </div>
        <div className="fadeUp panel border-l-2 border-l-[var(--verd)] p-5" style={{ animationDelay: "80ms" }}>
          <div className="display text-xl text-[var(--verd2)]">.ANCT</div>
          <p className="mono mt-1 text-[10px] tracking-[0.2em] text-[var(--dim)]">АРГСКАЯ НАРОДНАЯ ЦИФРОВАЯ ТЕРРИТОРИЯ</p>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--txt2)]">
            Имена для служб общего пользования и подданных: почта, Аргфон, вести. Пошлина — один империал
            в год. Прошение подаётся через Имперскую канцелярию.
          </p>
        </div>
      </div>

      <div className="panel mt-6 overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              <th>Домен</th>
              <th>Назначение</th>
              <th>Владелец</th>
              <th>Жалован</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            {db.domains.map((d) => (
              <tr key={domainFull(d)}>
                <td>
                  <button
                    onClick={() => nav(domainFull(d))}
                    className={`mono font-semibold transition-opacity hover:opacity-75 ${
                      d.tld === "arg" ? "text-[var(--brass2)]" : "text-[var(--verd2)]"
                    }`}
                  >
                    {domainFull(d)}
                  </button>
                </td>
                <td className="text-[var(--txt2)]">{KIND_LABEL[d.kind]}</td>
                <td className="mono text-[12px] text-[var(--txt2)]">{d.owner}</td>
                <td className="mono text-[12px] text-[var(--txt2)]">{fmtDate(d.createdAt)}</td>
                <td>
                  <span className="chip" style={{ color: "var(--verd2)", borderColor: "rgba(79,156,134,.5)" }}>
                    действует
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {user.role === "admin" ? (
        <div className="mt-5 flex items-center justify-between gap-4 border border-dashed border-[var(--brass)] bg-[rgba(201,163,92,.05)] p-4">
          <p className="text-[13px] text-[var(--txt2)]">
            Вы администратор: жаловать и отзывать домены можно в Имперской канцелярии.
          </p>
          <button className="btn btn-brass shrink-0" onClick={() => nav("upravlenie.arg")}>
            Открыть канцелярию
          </button>
        </div>
      ) : (
        <p className="mono mt-5 text-[11px] text-[var(--dim)]">
          Прошение о домене подаётся Государю через Имперскую канцелярию (upravlenie.arg).
        </p>
      )}
    </div>
  );
}

/* ================= заглушка ================= */

export function StubSite({ name, desc, owner, nav }: { name: string; desc: string; owner: string; nav: (h: string) => void }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-5 py-20 text-center">
      <div className="fadeUp flex h-16 w-16 items-center justify-center border border-dashed border-[var(--line2)]">
        <span className="display text-2xl text-[var(--dim)]">З</span>
      </div>
      <h1 className="display mt-5 text-2xl tracking-wide">{name}</h1>
      <p className="mono mt-2 text-[11px] tracking-[0.2em] text-[var(--verd2)]">УЗЕЛ ЗАРЕГИСТРИРОВАН • СТРОИТЕЛЬСТВО ВЕДЁТСЯ</p>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-[var(--txt2)]">{desc}</p>
      <p className="mono mt-2 text-[11px] text-[var(--dim)]">владелец: {owner} • бригада связистов уже на месте</p>
      <div className="mt-6 flex gap-2">
        <button className="btn" onClick={() => nav("portal.arg")}>На портал</button>
        <button className="btn" onClick={() => nav("registr.arg")}>В реестр</button>
      </div>
    </div>
  );
}
