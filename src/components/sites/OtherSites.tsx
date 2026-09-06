import { useState } from "react";
import {
  useDB,
  transfer,
  txFor,
  addComplaint,
  resolveComplaint,
  toggleBlock,
  userName,
  fmtDT,
  fmtDur,
  toast,
  type Domain,
  type User,
} from "../../lib/db";
import { Emblem, IcBank, IcCheck, IcLock, IcPower, IcRadar, IcRefresh, IcScale, IcShield, IcX } from "../../lib/icons";

/* ================= StatusBanko (sb.arg) ================= */

export function BankSite({ user }: { user: User }) {
  const db = useDB();
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const me = db.users.find((u) => u.login === user.login) ?? user;
  const others = db.users.filter((u) => u.login !== user.login);
  const journal = txFor(user.login);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const r = transfer(user.login, to, Number(amount), note);
    if (r) return setErr(r);
    setErr(null);
    setAmount("");
    setNote("");
    setTo("");
    toast(`Транзакция исполнена: ${Number(amount).toLocaleString("ru-RU")} e-T списано со счёта`);
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="fadeUp flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mono text-[10px] tracking-[0.3em] text-[var(--dim)]">ГОСУДАРСТВЕННЫЙ БАНК • SB.ARG • ПОРТ 8001</p>
          <h1 className="display mt-2 text-3xl font-extrabold tracking-wide sm:text-4xl">
            STATUS<span className="text-[var(--gold)]">BANKO</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <IcBank size={30} className="text-[var(--gold)]" />
          <div className="mono text-[10px] leading-4 text-[var(--txt2)]">
            КАССА ОТКРЫТА<br />
            <span className="text-[var(--dim)]">ТРАНЗАКЦИИ ПОД НАДЗОРОМ ГНИЦСТ</span>
          </div>
        </div>
      </div>
      <div className="goldline mt-5" />

      <div className="mt-7 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4">
          <div className="panel fadeUp relative overflow-hidden p-6">
            <div className="pointer-events-none absolute -right-6 -top-8 opacity-10">
              <Emblem size={150} />
            </div>
            <p className="mono text-[10px] tracking-[0.25em] text-[var(--dim)]">КАЗНАЧЕЙСКИЙ СЧЁТ</p>
            <div className="display mt-3 text-[42px] font-extrabold leading-none text-[var(--gold2)]">
              {me.balance.toLocaleString("ru-RU")} <span className="text-xl text-[var(--gold)]">e-T</span>
            </div>
            <div className="mono mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] text-[var(--txt2)]">
              <span>ДЕРЖАТЕЛЬ: <span className="text-[var(--txt)]">{me.name}</span></span>
              <span>IŦIRINIO: <span className="text-[var(--txt)]">{me.itirinio}</span></span>
              <span>ГИКС: <span className="text-[var(--txt)]">{me.giks}</span></span>
              <span>СТАТУС: <span className="text-[var(--txt)]">{me.kind === "legal" ? "ЮЛ" : "Ťivitano"}</span></span>
            </div>
          </div>

          <form onSubmit={submit} className="panel fadeUp p-5" style={{ animationDelay: "80ms" }}>
            <h3 className="display text-base font-bold">ПЕРЕВОД e-T</h3>
            <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
              <div>
                <label className="mono mb-1 block text-[9.5px] tracking-[0.2em] text-[var(--dim)]">ПОЛУЧАТЕЛЬ</label>
                <select className="field" value={to} onChange={(e) => setTo(e.target.value)}>
                  <option value="">— выберите счёт —</option>
                  {others.map((u) => (
                    <option key={u.login} value={u.login}>{u.name} • {u.itirinio}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mono mb-1 block text-[9.5px] tracking-[0.2em] text-[var(--dim)]">СУММА e-T</label>
                <input className="field mono" type="number" min={1} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
              </div>
              <div className="sm:col-span-2">
                <label className="mono mb-1 block text-[9.5px] tracking-[0.2em] text-[var(--dim)]">НАЗНАЧЕНИЕ ПЛАТЕЖА (ОБЯЗАТЕЛЬНО)</label>
                <input className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Пошлина, жалование, счёт…" />
              </div>
            </div>
            {err && <p className="mono mt-3 border border-[var(--red2)] bg-[rgba(139,0,0,.12)] px-3 py-2 text-[11.5px] text-[var(--red3)]">{err}</p>}
            <button type="submit" className="btn btn-gold mt-4"><IcBank size={14} /> Исполнить транзакцию</button>
          </form>
        </div>

        <div className="panel fadeUp p-5" style={{ animationDelay: "140ms" }}>
          <h3 className="display text-base font-bold">ЖУРНАЛ ОПЕРАЦИЙ</h3>
          <div className="mt-3">
            {journal.length === 0 && <p className="mono text-[11px] text-[var(--dim)]">Операций по счёту не было.</p>}
            {journal.map((t) => {
              const out = t.from === user.login;
              return (
                <div key={t.id} className="border-b border-[var(--line)] py-2.5 last:border-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className={`mono text-[13px] font-bold ${out ? "text-[var(--red3)]" : "text-[var(--gold2)]"}`}>
                      {out ? "−" : "+"}{t.amount.toLocaleString("ru-RU")} e-T
                    </span>
                    <span className="mono text-[10px] text-[var(--dim)]">{fmtDT(t.ts)}</span>
                  </div>
                  <div className="mt-0.5 text-[12px] text-[var(--txt2)]">
                    {out ? `Получатель: ${userName(t.to)}` : `Плательщик: ${userName(t.from)}`} — {t.note}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="mono mt-6 text-[10px] leading-5 tracking-[0.14em] text-[var(--dim)]">
        В СООТВЕТСТВИИ СО СТ. 1 (187) КГТ ВСЕ ТРАНЗАКЦИИ e-T АВТОМАТИЧЕСКИ АНАЛИЗИРУЮТСЯ АЛГОРИТМАМИ ГНИЦСТ.
        ОПЕРАЦИИ БЕЗ НАЗНАЧЕНИЯ ТРАКТУЮТСЯ КАК ПОДОЗРИТЕЛЬНЫЕ.
      </p>
    </div>
  );
}

/* ================= ГНИЦСТ (gnicst.anct) ================= */

const LOADS = [42, 67, 38, 55, 71, 49];

export function GnicstSite({ user }: { user: User }) {
  const db = useDB();
  const [restarting, setRestarting] = useState<number | null>(null);

  const restart = (port: number, name: string) => {
    if (restarting !== null) return;
    setRestarting(port);
    setTimeout(() => {
      setRestarting(null);
      toast(`Служба ${name} (порт ${port}) перезапущена. Сбой сброшен`, "info");
    }, 2200);
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="fadeUp flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mono text-[10px] tracking-[0.3em] text-[var(--red3)]">ЗАКРЫТЫЙ КОНТУР • ДОСТУП: {user.role === "root" ? "ROOT" : "ТЕХНИЧЕСКИЙ СПЕЦИАЛИСТ"}</p>
          <h1 className="display mt-2 text-3xl font-extrabold tracking-wide sm:text-4xl">
            ГНИЦСТ <span className="text-[var(--gold)]">•</span> МОНИТОРИНГ
          </h1>
          <p className="mono mt-1 text-[10px] tracking-[0.22em] text-[var(--dim)]">GNICST.ANCT • ПОРТ 8002 • KOSTOSĘRIO DĘ ARCANUM</p>
        </div>
        <div className="flex items-center gap-2">
          <IcRadar size={26} className="spin-slow text-[var(--gold)]" />
          <span className="mono text-[10px] text-[var(--txt2)]">ОБЗОР АКТИВЕН</span>
        </div>
      </div>
      <div className="goldline mt-5" />

      <div className="mt-7 grid gap-3 sm:grid-cols-3">
        {LOADS.slice(0, 3).map((l, i) => (
          <div key={i} className="panel p-4">
            <div className="mono flex items-center justify-between text-[10px] tracking-[0.2em] text-[var(--dim)]">
              <span>{["НАГРУЗКА УЗЛА 01", "ТРАФИК КЭП/ГИКС", "АНАЛИЗ КГТ"][i]}</span>
              <span className="text-[var(--gold2)]">{l}%</span>
            </div>
            <div className="mt-2 h-1.5 w-full bg-[var(--line)]">
              <div
                className="h-full transition-all duration-700"
                style={{ width: `${l}%`, background: l > 65 ? "var(--red2)" : "var(--gold)" }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="panel mt-5 overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              <th>Служба</th>
              <th>Порт</th>
              <th>Проект</th>
              <th>Состояние</th>
              <th>Аптайм</th>
              <th className="text-right">Управление</th>
            </tr>
          </thead>
          <tbody>
            {db.domains.map((d, i) => (
              <tr key={d.port}>
                <td className="mono text-[12.5px] font-semibold text-[var(--gold2)]">{d.name}.{d.tld}</td>
                <td className="mono text-[12px]">:{d.port}</td>
                <td className="text-[12px] text-[var(--txt2)]">Django • gunicorn</td>
                <td>
                  {restarting === d.port ? (
                    <span className="chip chip-gold blink">перезапуск…</span>
                  ) : (
                    <span className="chip" style={{ color: "var(--gold2)", borderColor: "rgba(212,175,55,.5)" }}>в строю</span>
                  )}
                </td>
                <td className="mono text-[11.5px] text-[var(--txt2)]">{fmtDur(86400 + i * 7311)}</td>
                <td className="text-right">
                  <button className="btn px-2.5 py-1.5 text-[10px]" onClick={() => restart(d.port, `${d.name}.${d.tld}`)} disabled={restarting !== null}>
                    <IcRefresh size={12} /> Перезапуск
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="display mt-8 text-base font-bold">ЖУРНАЛ АУДИТА ЕГИКС</h3>
      <div className="panel mt-3 max-h-72 overflow-y-auto">
        {db.log.map((l, i) => (
          <div key={i} className="flex gap-4 border-b border-[var(--line)] px-4 py-2 last:border-0">
            <span className="mono shrink-0 text-[10.5px] text-[var(--dim)]">{fmtDT(l.ts)}</span>
            <span className="text-[12.5px] text-[var(--txt2)]">{l.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================= Ведомственные узлы ================= */

const AGENCIES = {
  kustos: {
    title: "СТРАЖА",
    sub: "KUSTOS.ARG • ПОРТ 8006 • ПРАВОПОРЯДОК",
    desc: "Стража (Kustos) ведает правопорядком в ARG-Net: принимает жалобы подданных, пресекает нарушения Закона Toqorro и исполняет решения по учётным записям.",
    motto: "«ПОРЯДОК ЕСТЬ ОСНОВА ИМПЕРИИ»",
  },
  kustodia: {
    title: "ГВАРДИЯ",
    sub: "KUSTODIA.ARG • ПОРТ 8007 • ОХРАНА ДВОРЦА",
    desc: "Гвардия (Kustodia) несёт охрану Дворца Palacium Ręgnum и Канцелярии. Сведения о караулах, постах и пропускном режиме составляют государственную тайну.",
    motto: "«НИ ШАГУ БЕЗ ПОВЕЛЕНИЯ»",
  },
  ante: {
    title: "АРМИЯ",
    sub: "ANTE.ANCT • ПОРТ 8008 • ВОЕННЫЙ КОНТУР",
    desc: "Военный контур (Tęrra-an / Cię-an) объединяет штабные узлы армии Империи. Сведения о дислокации, учениях и вооружении засекречены по КГТ.",
    motto: "«КОРОНА ПРИКАЗЫВАЕТ — АРМИЯ ИСПОЛНЯЕТ»",
  },
} as const;

export function AgencySite({ user, agency }: { user: User; agency: keyof typeof AGENCIES }) {
  const db = useDB();
  const conf = AGENCIES[agency];
  const isMod = user.role === "moderator" || user.role === "root";

  const [subj, setSubj] = useState("");
  const [text, setText] = useState("");

  const submitComplaint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subj.trim() || !text.trim()) return toast("Заполните суть жалобы и описание", "err");
    addComplaint(user.login, subj, text);
    setSubj("");
    setText("");
    toast("Жалоба принята Стражей и внесена в реестр", "ok");
  };

  const duty = ["Караул у Врат Дворца — смена 2", "Обход периметра Канцелярии — 03:00", "Пост у узла kance.arg — круглосуточно"];
  const ops = ["Учения «Южный тракт» — полнолуние", "Проверка резервных линий — ежедневно", "Кодовая смена шифров АРГ-256 — по графику"];

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <div className="fadeUp flex flex-wrap items-start gap-5">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center border border-[var(--red2)] bg-[rgba(139,0,0,.12)]">
          <IcShield size={30} className="text-[var(--red3)]" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="display text-3xl font-extrabold tracking-wide sm:text-4xl">{conf.title}</h1>
          <p className="mono mt-1 text-[10px] tracking-[0.25em] text-[var(--dim)]">{conf.sub}</p>
          <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-[var(--txt2)]">{conf.desc}</p>
          <p className="display mt-3 text-sm italic text-[var(--gold2)]">{conf.motto}</p>
        </div>
        <span className="chip chip-red">ВЕДОМСТВЕННЫЙ УЗЕЛ</span>
      </div>
      <div className="goldline mt-6" />

      {agency === "kustos" && (
        <div className="mt-7 grid gap-4 lg:grid-cols-2">
          <div className="panel p-5">
            <div className="flex items-center justify-between">
              <h3 className="display flex items-center gap-2 text-base font-bold"><IcScale size={17} className="text-[var(--gold)]" /> ЖАЛОБЫ И НАРУШЕНИЯ</h3>
              <span className="chip chip-red">открыто: {db.complaints.filter((c) => c.status === "open").length}</span>
            </div>
            <div className="mt-3 space-y-3">
              {db.complaints.map((c) => (
                <div key={c.id} className="border border-[var(--line)] p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[13px] font-semibold">{c.subject}</span>
                    <span className={`chip ${c.status === "open" ? "chip-red" : ""}`}>
                      {c.status === "open" ? "в производстве" : c.status === "resolved" ? "удовлетворена" : "отклонена"}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--txt2)]">{c.text}</p>
                  <div className="mono mt-2 flex items-center justify-between text-[10px] text-[var(--dim)]">
                    <span>от: {userName(c.from)} • {fmtDT(c.ts)}</span>
                    {isMod && c.status === "open" && (
                      <span className="flex gap-1.5">
                        <button className="btn px-2 py-1 text-[9.5px]" onClick={() => { resolveComplaint(c.id, "resolved"); toast("Жалоба удовлетворена", "ok"); }}>
                          <IcCheck size={11} /> Удовлетворить
                        </button>
                        <button className="btn btn-danger px-2 py-1 text-[9.5px]" onClick={() => { resolveComplaint(c.id, "dismissed"); toast("Жалоба отклонена", "info"); }}>
                          <IcX size={11} /> Отклонить
                        </button>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <form onSubmit={submitComplaint} className="panel p-5">
              <h3 className="display text-base font-bold">ПОДАТЬ ЖАЛОБУ</h3>
              <input className="field mt-3" placeholder="Суть жалобы" value={subj} onChange={(e) => setSubj(e.target.value)} />
              <textarea className="field mt-2.5 h-24 resize-none leading-6" placeholder="Подробное описание обстоятельств…" value={text} onChange={(e) => setText(e.target.value)} />
              <button type="submit" className="btn btn-gold mt-3"><IcScale size={14} /> Передать в Стражу</button>
            </form>

            {isMod && (
              <div className="panel p-5">
                <h3 className="display text-base font-bold">РЕЕСТР ПОДДАННЫХ • БЛОКИРОВКА</h3>
                <p className="mono mt-1 text-[9.5px] tracking-[0.15em] text-[var(--dim)]">МАНДАТ МОДЕРАТОРА: СТ. 3 (67) УК АК</p>
                <div className="mt-3">
                  {db.users.filter((u) => u.role === "user").map((u) => (
                    <div key={u.login} className="flex items-center justify-between border-b border-[var(--line)] py-2 last:border-0">
                      <div>
                        <div className={`text-[12.5px] font-semibold ${u.blocked ? "line-through opacity-50" : ""}`}>{u.name}</div>
                        <div className="mono text-[10px] text-[var(--dim)]">{u.itirinio}</div>
                      </div>
                      <button
                        className={`btn px-2.5 py-1.5 text-[9.5px] ${u.blocked ? "btn-gold" : "btn-danger"}`}
                        onClick={() => {
                          const r = toggleBlock(u.login);
                          if (r) toast(r, "err");
                        }}
                      >
                        {u.blocked ? "Разблокировать" : "Заблокировать"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {agency !== "kustos" && (
        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          <div className="panel p-5">
            <h3 className="mono text-[10px] tracking-[0.25em] text-[var(--dim)]">{agency === "kustodia" ? "НАРЯДЫ (ОБЩЕДОСТУПНОЕ)" : "СВОДКА (ОБЩЕДОСТУПНОЕ)"}</h3>
            <div className="mt-3 space-y-2.5">
              {(agency === "kustodia" ? duty : ops).map((d, i) => (
                <div key={i} className="flex items-center gap-3 border-b border-[var(--line)] pb-2.5 text-[13px] text-[var(--txt2)] last:border-0">
                  <span className="mono text-[var(--gold)]">{String(i + 1).padStart(2, "0")}</span>
                  {d}
                </div>
              ))}
            </div>
          </div>
          <div className="panel flex flex-col items-center justify-center border-dashed p-5 text-center">
            <IcLock size={26} className="text-[var(--red3)]" />
            <p className="display mt-3 text-base font-bold">СВЕДЕНИЯ СОСТАВЛЯЮТ ГОСУДАРСТВЕННУЮ ТАЙНУ</p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--txt2)]">
              Полные материалы доступны только по мандату, выданному Канцелярией Дворца. Запросы о
              разглашении преследуются по Ст. 2 (66) УК АК.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= login.arg (внутри сети) ================= */

export function ServiceSite({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-5 py-20 text-center">
      <Emblem size={84} />
      <h1 className="display mt-5 text-2xl font-extrabold tracking-wide sm:text-3xl">УЗЕЛ АУТЕНТИФИКАЦИИ LOGIN.ARG</h1>
      <p className="mono mt-2 text-[10px] tracking-[0.25em] text-[var(--dim)]">ПОРТ 8000 • ЕДИНЫЙ ПОРТАЛ SSO</p>
      <div className="panel mt-6 w-full max-w-md p-5 text-left">
        <p className="mono text-[10px] tracking-[0.22em] text-[var(--dim)]">ДЕЙСТВИТЕЛЬНЫЙ СЕАНС</p>
        <div className="mt-2 space-y-1.5 text-[13px]">
          <div>Подданный: <span className="font-bold text-[var(--gold2)]">{user.name}</span></div>
          <div className="mono text-[11.5px] text-[var(--txt2)]">Iŧirinio {user.itirinio} • ГиКС {user.giks}</div>
        </div>
        <p className="mt-3 text-[12.5px] text-[var(--txt2)]">Аутентификация уже пройдена. Повторный вход не требуется.</p>
      </div>
      <button className="btn btn-red mt-5" onClick={onLogout}>
        <IcPower size={14} /> Разорвать соединение и выйти
      </button>
    </div>
  );
}

/* ================= заглушка ================= */

export function StubSite({ domain, nav }: { domain: Domain; nav: (h: string) => void }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-5 py-20 text-center">
      <div className="fadeUp flex h-16 w-16 items-center justify-center border border-dashed border-[var(--line2)]">
        <span className="display text-2xl text-[var(--dim)]">Р</span>
      </div>
      <h1 className="display mt-5 text-2xl font-extrabold">{domain.name}.{domain.tld}</h1>
      <p className="mono mt-2 text-[11px] tracking-[0.2em] text-[var(--gold2)]">ДОМЕН ВЫДЕЛЕН • ПОРТ {domain.port} • СЛУЖБА РАЗВЁРТЫВАЕТСЯ</p>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-[var(--txt2)]">{domain.desc}</p>
      <p className="mono mt-2 text-[11px] text-[var(--dim)]">владелец: {domain.owner} • Django-проект будет подключён Канцелярией</p>
      <div className="mt-6 flex gap-2">
        <button className="btn" onClick={() => nav("krg.arg")}>На портал</button>
      </div>
    </div>
  );
}
