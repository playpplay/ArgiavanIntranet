import { useMemo, useState } from "react";
import {
  useDB,
  createUser,
  deleteUser,
  toggleBlock,
  resetPassword,
  registerDomain,
  deleteDomain,
  domainFull,
  genGiks,
  KIND_LABEL,
  ROLE_LABEL,
  PREFECTURES,
  prefName,
  fmtDT,
  toast,
  type Role,
  type SiteKind,
  type Tld,
  type User,
  type UserKind,
} from "../../lib/db";
import { ENDPOINTS, API_BASE, USE_REMOTE } from "../../lib/api";
import { Emblem, IcDoc, IcGlobe, IcKey, IcNode, IcPlus, IcStamp, IcTrash, IcUsers } from "../../lib/icons";

type Tab = "users" | "domains" | "log" | "api";

export default function KanceSite({ user }: { user: User }) {
  useDB();
  const isRoot = user.role === "root";
  const [tab, setTab] = useState<Tab>("users");

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <div className="fadeUp flex flex-wrap items-center gap-4">
        <Emblem size={58} />
        <div className="min-w-0">
          <h1 className="display text-2xl font-extrabold tracking-wide sm:text-3xl">
            КАНЦЕЛЯРИЯ <span className="text-[var(--gold)]">ДВОРЦА</span>
          </h1>
          <p className="mono mt-1 text-[10px] tracking-[0.25em] text-[var(--dim)]">
            KANCE.ARG • ПОРТ 8005 • PALACIUM RĘGNUM • {isRoot ? "ПОЛНЫЙ МАНДАТ ROOT" : "МАНДАТ ОПЕРАТОРА КОЛЛЕГИИ"}
          </p>
        </div>
        <span className="chip chip-gold ml-auto hidden sm:block">DSP</span>
      </div>
      <div className="goldline mt-5" />

      <div className="mt-5 flex flex-wrap gap-1.5">
        {(
          [
            { id: "users", label: isRoot ? "Реестр Iŧirinio" : "Юр. лица и номера", icon: <IcUsers size={14} /> },
            ...(isRoot
              ? ([
                  { id: "domains", label: "Домены .arg / .anct", icon: <IcGlobe size={14} /> },
                  { id: "log", label: "Журнал аудита", icon: <IcDoc size={14} /> },
                  { id: "api", label: "Интеграция API", icon: <IcNode size={14} /> },
                ] as Array<{ id: Tab; label: string; icon: React.ReactNode }>)
              : []),
          ] as Array<{ id: Tab; label: string; icon: React.ReactNode }>
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 border px-4 py-2 text-[11.5px] font-semibold uppercase tracking-wider transition-all ${
              tab === t.id
                ? "border-[var(--gold)] bg-[rgba(212,175,55,.09)] text-[var(--gold2)]"
                : "border-[var(--line)] text-[var(--txt2)] hover:border-[var(--line2)] hover:text-[var(--txt)]"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === "users" && <UsersTab isRoot={isRoot} />}
        {tab === "domains" && isRoot && <DomainsTab />}
        {tab === "log" && isRoot && <LogTab />}
        {tab === "api" && isRoot && <ApiTab />}
      </div>
    </div>
  );
}

/* ================= Реестр Iŧirinio ================= */

function UsersTab({ isRoot }: { isRoot: boolean }) {
  const db = useDB();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>(isRoot ? "user" : "user");
  const [kind, setKind] = useState<UserKind>(isRoot ? "citizen" : "legal");
  const [pref, setPref] = useState("00");
  const [balance, setBalance] = useState(100);
  const [err, setErr] = useState<string | null>(null);

  const previewGiks = useMemo(() => genGiks({ role, kind, pref }), [role, kind, pref]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const r = createUser({ login, name, password, role: isRoot ? role : "user", kind: isRoot ? kind : "legal", pref, balance });
    if (r.err) return setErr(r.err);
    setErr(null);
    setOpen(false);
    setName("");
    setLogin("");
    setPassword("");
    toast(`Iŧirinio ${r.user!.itirinio} выдан, ГиКС ${r.user!.giks} присвоен`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="mono text-[10.5px] tracking-[0.2em] text-[var(--dim)]">
          ГОСУДАРСТВЕННЫЙ РЕЕСТР • {db.users.length} IŦIRINIO
        </p>
        <button className="btn btn-gold" onClick={() => setOpen((o) => !o)}>
          <IcPlus size={14} /> {isRoot ? "Выдать Iŧirinio" : "Регистрировать ЮЛ"}
        </button>
      </div>

      {open && (
        <form onSubmit={submit} className="panel siteIn p-5">
          <h3 className="display text-base font-bold">НОВЫЙ {isRoot ? "ПОДДАННЫЙ / СЛУЖБА" : "СУБЪЕКТ (ЮРИДИЧЕСКОЕ ЛИЦО)"}</h3>
          <div className="mt-4 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mono mb-1 block text-[9.5px] tracking-[0.2em] text-[var(--dim)]">ФАМИЛИЯ И.О. / НАИМЕНОВАНИЕ</label>
              <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Сидоров К.М." />
            </div>
            <div>
              <label className="mono mb-1 block text-[9.5px] tracking-[0.2em] text-[var(--dim)]">ЛОГИН (СИСТЕМНЫЙ)</label>
              <input className="field mono" value={login} onChange={(e) => setLogin(e.target.value)} placeholder="sidorov" />
            </div>
            <div>
              <label className="mono mb-1 block text-[9.5px] tracking-[0.2em] text-[var(--dim)]">ПАРОЛЬ (≥ 6 ЗНАКОВ)</label>
              <input className="field mono" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" />
            </div>
            {isRoot && (
              <>
                <div>
                  <label className="mono mb-1 block text-[9.5px] tracking-[0.2em] text-[var(--dim)]">СТАТУС ПО ТАБЕЛИ</label>
                  <select className="field" value={role} onChange={(e) => setRole(e.target.value as Role)}>
                    {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                      <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mono mb-1 block text-[9.5px] tracking-[0.2em] text-[var(--dim)]">ТИП СУБЪЕКТА</label>
                  <select className="field" value={kind} onChange={(e) => setKind(e.target.value as UserKind)}>
                    <option value="citizen">Ťivitano (гражданин) — префикс 17</option>
                    <option value="legal">Юридическое лицо — префикс 23</option>
                  </select>
                </div>
              </>
            )}
            <div>
              <label className="mono mb-1 block text-[9.5px] tracking-[0.2em] text-[var(--dim)]">ПРЕФЕКТУРА (УКАЗ № 24)</label>
              <select className="field" value={pref} onChange={(e) => setPref(e.target.value)}>
                {PREFECTURES.map((p) => (
                  <option key={p.code} value={p.code}>{p.code} — {p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mono mb-1 block text-[9.5px] tracking-[0.2em] text-[var(--dim)]">НАЧАЛЬНЫЙ СЧЁТ e-T</label>
              <input className="field mono" type="number" min={0} value={balance} onChange={(e) => setBalance(Number(e.target.value))} />
            </div>
          </div>
          <div className="mono mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 border border-dashed border-[var(--gold)] bg-[rgba(212,175,55,.05)] px-4 py-2.5 text-[11px] text-[var(--txt2)]">
            <span>IŦIRINIO: <span className="text-[var(--gold2)]">выдаётся автоматически</span></span>
            <span>ГИКС: <span className="text-[var(--gold2)]">{previewGiks}</span></span>
          </div>
          {err && <p className="mono mt-3 border border-[var(--red2)] bg-[rgba(139,0,0,.12)] px-3 py-2 text-[11.5px] text-[var(--red3)]">{err}</p>}
          <div className="mt-4 flex gap-2">
            <button type="submit" className="btn btn-gold"><IcStamp size={14} /> Утвердить и внести в реестр</button>
            <button type="button" className="btn" onClick={() => setOpen(false)}>Отмена</button>
          </div>
        </form>
      )}

      <div className="panel overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              <th>Iŧirinio</th>
              <th>Имя</th>
              <th>Статус</th>
              <th>ГиКС</th>
              <th>Префектура</th>
              <th>e-T</th>
              <th className="text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            {db.users.map((u) => (
              <tr key={u.login} className={u.blocked ? "opacity-50" : ""}>
                <td className="mono text-[12px] font-semibold text-[var(--gold2)]">{u.itirinio}</td>
                <td>
                  <div className="font-semibold">{u.name}</div>
                  <div className="mono text-[10px] text-[var(--dim)]">{u.login}{u.blocked && <span className="text-[var(--red3)]"> • заблокирован</span>}</div>
                </td>
                <td><span className={`chip ${u.role === "root" ? "chip-gold" : ""}`}>{ROLE_LABEL[u.role]}{u.kind === "legal" ? " / ЮЛ" : ""}</span></td>
                <td className="mono text-[12px]">{u.giks}</td>
                <td className="text-[12px] text-[var(--txt2)]">{prefName(u.pref)}</td>
                <td className="mono text-[12px]">{u.balance.toLocaleString("ru-RU")}</td>
                <td>
                  <div className="flex justify-end gap-1.5">
                    <button
                      className="btn px-2.5 py-1.5 text-[10px]"
                      title="Перевыпустить пароль"
                      onClick={() => toast(`Новый пароль для ${u.login}: ${resetPassword(u.login)}`, "info")}
                    >
                      <IcKey size={12} />
                    </button>
                    <button
                      className={`btn px-2.5 py-1.5 text-[10px] ${u.blocked ? "btn-verd" : ""}`}
                      title={u.blocked ? "Разблокировать" : "Заблокировать (ст. 3 (67))"}
                      onClick={() => {
                        const r = toggleBlock(u.login);
                        if (r) toast(r, "err");
                        else toast(u.blocked ? `Учётная запись ${u.login} разблокирована` : `Учётная запись ${u.login} заблокирована`, u.blocked ? "ok" : "info");
                      }}
                    >
                      {u.blocked ? "Вернуть" : "Блок"}
                    </button>
                    {isRoot && (
                      <button
                        className="btn btn-danger px-2.5 py-1.5 text-[10px]"
                        title="Аннулировать Iŧirinio"
                        onClick={() => {
                          const r = deleteUser(u.login);
                          if (r) toast(r, "err");
                          else toast(`Iŧirinio ${u.login} аннулирован`, "err");
                        }}
                      >
                        <IcTrash size={12} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!isRoot && (
        <p className="mono text-[10.5px] text-[var(--dim)]">
          МАНДАТ ОПЕРАТОРА КОЛЛЕГИИ: РЕГИСТРАЦИЯ ЮЛ (ПРЕФИКС 23) И ВЫДАЧА ВЕДОМСТВЕННЫХ НОМЕРОВ. БЛОКИРОВКА —
          ПО СОГЛАСОВАНИЮ СО СТРАЖЕЙ (KUSTOS.ARG).
        </p>
      )}
    </div>
  );
}

/* ================= Домены ================= */

function DomainsTab() {
  const db = useDB();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [tld, setTld] = useState<Tld>("arg");
  const [kind, setKind] = useState<SiteKind>("stub");
  const [owner, setOwner] = useState("krol");
  const [desc, setDesc] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const r = registerDomain({ name, tld, kind, owner, desc });
    if (r) return setErr(r);
    setErr(null);
    setOpen(false);
    setName("");
    setDesc("");
    toast(`Домен ${name}.${tld} выделен, порт назначен автоматически`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="mono text-[10.5px] tracking-[0.2em] text-[var(--dim)]">
          РЕЕСТР ДОМЕННЫХ ЗОН • {db.domains.length} ИМЁН • dnsmasq → nginx → Django
        </p>
        <button className="btn btn-gold" onClick={() => setOpen((o) => !o)}>
          <IcPlus size={14} /> Выделить домен
        </button>
      </div>

      {open && (
        <form onSubmit={submit} className="panel siteIn p-5">
          <h3 className="display text-base font-bold">НОВЫЙ УЗЕЛ ARG-NET</h3>
          <div className="mt-4 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mono mb-1 block text-[9.5px] tracking-[0.2em] text-[var(--dim)]">ИМЯ УЗЛА</label>
              <input className="field mono" value={name} onChange={(e) => setName(e.target.value)} placeholder="kazna" />
            </div>
            <div>
              <label className="mono mb-1 block text-[9.5px] tracking-[0.2em] text-[var(--dim)]">ЗОНА</label>
              <select className="field" value={tld} onChange={(e) => setTld(e.target.value as Tld)}>
                <option value="arg">.arg — государственный сектор</option>
                <option value="anct">.anct — Народная Цифровая Территория</option>
              </select>
            </div>
            <div>
              <label className="mono mb-1 block text-[9.5px] tracking-[0.2em] text-[var(--dim)]">НАЗНАЧЕНИЕ</label>
              <select className="field" value={kind} onChange={(e) => setKind(e.target.value as SiteKind)}>
                {(Object.keys(KIND_LABEL) as SiteKind[]).map((k) => (
                  <option key={k} value={k}>{KIND_LABEL[k]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mono mb-1 block text-[9.5px] tracking-[0.2em] text-[var(--dim)]">ВЛАДЕЛЕЦ (ЛОГИН)</label>
              <select className="field" value={owner} onChange={(e) => setOwner(e.target.value)}>
                {db.users.map((u) => (
                  <option key={u.login} value={u.login}>{u.name} ({u.login})</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mono mb-1 block text-[9.5px] tracking-[0.2em] text-[var(--dim)]">ОПИСАНИЕ</label>
              <input className="field" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Назначение узла" />
            </div>
          </div>
          {err && <p className="mono mt-3 border border-[var(--red2)] bg-[rgba(139,0,0,.12)] px-3 py-2 text-[11.5px] text-[var(--red3)]">{err}</p>}
          <div className="mt-4 flex gap-2">
            <button type="submit" className="btn btn-gold"><IcStamp size={14} /> Внести в реестр</button>
            <button type="button" className="btn" onClick={() => setOpen(false)}>Отмена</button>
          </div>
        </form>
      )}

      <div className="panel overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              <th>Домен</th>
              <th>Зона</th>
              <th>Назначение</th>
              <th>Порт</th>
              <th>Владелец</th>
              <th className="text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            {db.domains.map((d) => (
              <tr key={domainFull(d)}>
                <td className="mono text-[12.5px] font-semibold text-[var(--gold2)]">{domainFull(d)}</td>
                <td><span className={`chip ${d.tld === "arg" ? "chip-gold" : "chip-red"}`}>{d.tld}</span></td>
                <td className="text-[12.5px] text-[var(--txt2)]">{KIND_LABEL[d.kind]}</td>
                <td className="mono text-[12px]">:{d.port}</td>
                <td className="mono text-[12px] text-[var(--txt2)]">{d.owner}</td>
                <td className="text-right">
                  {!d.system ? (
                    <button
                      className="btn btn-danger px-2.5 py-1.5 text-[10px]"
                      onClick={() => {
                        const r = deleteDomain(domainFull(d));
                        if (r) toast(r, "err");
                        else toast(`Домен ${domainFull(d)} исключён из реестра`, "err");
                      }}
                    >
                      <IcTrash size={12} /> Исключить
                    </button>
                  ) : (
                    <span className="mono text-[9.5px] tracking-[0.15em] text-[var(--dim)]">ЗАЩИЩЁН КОРОНОЙ</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ================= Журнал ================= */

function LogTab() {
  const db = useDB();
  return (
    <div className="panel max-h-[560px] overflow-y-auto">
      {db.log.map((l, i) => (
        <div key={i} className="flex gap-4 border-b border-[var(--line)] px-4 py-2.5 last:border-0">
          <span className="mono shrink-0 text-[10.5px] text-[var(--dim)]">{fmtDT(l.ts)}</span>
          <span className="text-[12.5px] text-[var(--txt2)]">{l.text}</span>
        </div>
      ))}
    </div>
  );
}

/* ================= Интеграция API ================= */

function ApiTab() {
  return (
    <div className="space-y-4">
      <div className="panel p-5">
        <h3 className="display text-base font-bold">БОЕВОЙ КОНТУР: DJANGO REST API</h3>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--txt2)]">
          Прототип использует локальное хранилище браузера. При развёртывании на PythonAnywhere фронтенд
          отдаётся Django (StaticFiles), данные переходят в единый реестр (PostgreSQL/SQLite), а все действия
          ниже уходят в REST API через слой <span className="mono text-[var(--gold2)]">src/lib/api.ts</span>{" "}
          (флаг USE_REMOTE). Схема маршрутизации — по ТЗ п. 2.1: dnsmasq перехватывает *.arg / *.anct, nginx
          распределяет запросы по портам Django-проектов.
        </p>
        <div className="mono mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-[var(--dim)]">
          <span>API_BASE: <span className="text-[var(--gold2)]">{API_BASE}</span></span>
          <span>USE_REMOTE: <span className={USE_REMOTE ? "text-[var(--gold2)]" : "text-[var(--red3)]"}>{String(USE_REMOTE)}</span></span>
        </div>
      </div>
      <div className="panel overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              <th>Метод</th>
              <th>Эндпоинт</th>
              <th>Назначение</th>
              <th>Доступ</th>
            </tr>
          </thead>
          <tbody>
            {ENDPOINTS.map((e) => (
              <tr key={e.method + e.path}>
                <td>
                  <span className={`chip ${e.method === "GET" ? "" : e.method === "DELETE" ? "chip-red" : "chip-gold"}`}>{e.method}</span>
                </td>
                <td className="mono text-[12px] text-[var(--gold2)]">{API_BASE}{e.path}</td>
                <td className="text-[12.5px] text-[var(--txt2)]">{e.desc}</td>
                <td className="mono text-[11px] text-[var(--dim)]">{e.access}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
