import { useMemo, useState } from "react";
import {
  useDB,
  createUser,
  deleteUser,
  resetPassword,
  setBlocked,
  createZone,
  deleteZone,
  registerDomain,
  deleteDomain,
  domainFull,
  fmtDT,
  fmtDate,
  formatItirinio,
  updateUser,
  setPasswordManual,
  PREFS,
  ROLE_LABEL,
  toast,
  type Role,
  type User,
} from "../../lib/db";
import { API_BASE, API_ENDPOINTS } from "../../lib/api";
import { IcBan, IcCheck, IcDoc, IcEye, IcEyeOff, IcGlobe, IcKey, IcPlus, IcTrash, IcUsers, IcX } from "../../lib/icons";

const TABS = [
  { id: "users", label: "Паспорта и учётные" },
  { id: "zones", label: "Доменные зоны" },
  { id: "domains", label: "Домены" },
  { id: "log", label: "Журнал аудита" },
  { id: "api", label: "API" },
];

export default function KanceSite({ user }: { user: User }) {
  const db = useDB();
  const isRoot = user.role === "root";
  const [tab, setTab] = useState(isRoot ? "users" : "users");
  const [newPass, setNewPass] = useState<string | null>(null);
  const [issued, setIssued] = useState<User | null>(null);

  if (!isRoot && user.role !== "operator") {
    return (
      <div className="mx-auto max-w-2xl px-5 py-16 text-center">
        <h1 className="display text-2xl font-extrabold">ДОСТУП ОГРАНИЧЕН</h1>
        <p className="mt-3 text-sm text-[var(--txt2)]">Канцелярия ведёт приём только Верховного Администратора и Операторов Коллегий.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <div className="fadeUp flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mono text-[10px] tracking-[0.3em] text-[var(--dim)]">ДВОРЕЦ PALACIUM RĘGNUM • KANCE.ARG : 8005</p>
          <h1 className="display mt-2 text-3xl font-extrabold tracking-wide sm:text-4xl">ИМПЕРСКАЯ КАНЦЕЛЯРИЯ</h1>
        </div>
        <div className="mono text-[10.5px] leading-5 text-[var(--txt2)]">
          <div>ДЕЖУРНЫЙ: <span className="text-[var(--gold2)]">{user.name}</span></div>
          <div>МАНДАТ: <span className="text-[var(--gold2)]">{ROLE_LABEL[user.role]}</span></div>
        </div>
      </div>
      <div className="goldline mt-5" />

      {/* вкладки */}
      <div className="mt-5 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`btn px-3.5 py-2 text-[11px] ${tab === t.id ? "border-[var(--gold)] text-[var(--gold2)] bg-[rgba(212,175,55,.08)]" : ""}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isRoot && tab === "users" && (
        <UsersTab onIssued={(u) => setIssued(u)} onNewPass={(p) => setNewPass(p)} />
      )}
      {!isRoot && <OperatorTab onIssued={(u) => setIssued(u)} />}
      {isRoot && tab === "zones" && <ZonesTab />}
      {isRoot && tab === "domains" && <DomainsTab />}
      {isRoot && tab === "log" && <LogTab />}
      {isRoot && tab === "api" && <ApiTab />}

      {/* окно выдачи */}
      {(issued || newPass) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onClick={() => { setIssued(null); setNewPass(null); }}>
          <div className="panel w-full max-w-lg border-[rgba(212,175,55,.5)] p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <h3 className="display text-lg font-bold text-[var(--gold2)]">
                {newPass ? "НОВЫЙ ПАРОЛЬ ВЫПУЩЕН" : "ПАСПОРТ ВЫДАН"}
              </h3>
              <button onClick={() => { setIssued(null); setNewPass(null); }} className="text-[var(--dim)] hover:text-[var(--red3)]">
                <IcX size={18} />
              </button>
            </div>
            <div className="goldline my-4" />
            {newPass ? (
              <div>
                <p className="mono border border-dashed border-[var(--gold)] bg-[#0a0a0a] p-3 text-center text-xl tracking-[0.15em] text-[var(--gold2)]">
                  {newPass}
                </p>
                <p className="mt-3 text-[12.5px] text-[var(--txt2)]">
                  Передайте пароль владельцу IŦirinio лично или депешей с грифом. Старый пароль аннулирован. Действие внесено в журнал аудита.
                </p>
              </div>
            ) : issued ? (
              <div className="mono space-y-2 text-[12.5px]">
                <p className="text-[var(--txt)]">ИМЯ: <span className="text-[var(--gold2)]">{issued.name}</span></p>
                <p>IŦIRINIO: <span className="break-all text-[var(--gold2)]">{issued.itirinio}</span></p>
                <p>РОЛЬ: <span className="text-[var(--gold2)]">{ROLE_LABEL[issued.role]}</span></p>
                <p>ГИКС: <span className="text-[var(--gold2)]">{issued.giks}</span> (префектура {issued.pref})</p>
                <p>ЛОГИН: <span className="text-[var(--gold2)]">{issued.login}</span></p>
                <p className="pt-2 text-[11px] leading-5 text-[var(--txt2)]">
                  Почтовый ящик КЭП и номер ГиКС присвоены автоматически. Выдача зарегистрирована в Государственном реестре и журнале аудита.
                </p>
              </div>
            ) : null}
            <button className="btn btn-gold mt-5 w-full" onClick={() => { setIssued(null); setNewPass(null); }}>
              Завершить оформление
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- паспорта и учётные (root) ---------- */

function UsersTab({ onIssued, onNewPass }: { onIssued: (u: User) => void; onNewPass: (p: string) => void }) {
  const db = useDB();
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("citizen");
  const [pref, setPref] = useState("00");
  const [password, setPassword] = useState("");
  const [editing, setEditing] = useState<User | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = createUser({ name, role, password, pref });
    if (res.err) toast(res.err, "err");
    else if (res.user) {
      onIssued(res.user);
      setName("");
      setPassword("");
    }
  };

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-[380px_1fr]">
      <form onSubmit={submit} className="panel h-fit p-5">
        <h3 className="display flex items-center gap-2 text-sm font-bold tracking-wider">
          <IcPlus size={15} className="text-[var(--gold)]" /> ВЫДАЧА ПАСПОРТА
        </h3>
        <div className="goldline my-3" />
        <label className="mono text-[10px] tracking-[0.2em] text-[var(--dim)]">ИМЯ (Фамилия И.О. / наименование ЮЛ)</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="field mt-1" placeholder="Петров И. А." />
        <label className="mono mt-3 block text-[10px] tracking-[0.2em] text-[var(--dim)]">СОСЛОВИЕ (РОЛЬ)</label>
        <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="field mt-1">
          <option value="citizen">Ťivitano — гражданин (номер 17-…)</option>
          <option value="legal">Юридическое лицо (номер 23-…)</option>
          <option value="operator">Оператор Коллегии (номер 12-…)</option>
          <option value="tech">Технический специалист (номер 24-12-…)</option>
          <option value="moderator">Модератор (номер 24-01-…)</option>
        </select>
        {role === "citizen" && (
          <>
            <label className="mono mt-3 block text-[10px] tracking-[0.2em] text-[var(--dim)]">ПРЕФЕКТУРА (УКАЗ №24)</label>
            <select value={pref} onChange={(e) => setPref(e.target.value)} className="field mt-1">
              {PREFS.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
          </>
        )}
        <label className="mono mt-3 block text-[10px] tracking-[0.2em] text-[var(--dim)]">ПАРОЛЬ (НЕ МЕНЕЕ 6 ЗНАКОВ)</label>
        <input value={password} onChange={(e) => setPassword(e.target.value)} className="field mono mt-1" placeholder="••••••" />
        <button className="btn btn-gold mt-4 w-full">
          <IcDoc size={14} /> Выдать IŦirinio и номер ГиКС
        </button>
        <p className="mono mt-2 text-[9.5px] leading-4 text-[var(--dim)]">
          ПАСПОРТ (24 ЦИФРЫ) И НОМЕР ГИКС С КОНТРОЛЬНОЙ ЦИФРОЙ БУДУТ СФОРМИРОВАНЫ АВТОМАТИЧЕСКИ.
        </p>
      </form>

      <div className="panel overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              <th>Подданный</th>
              <th>IŦirinio</th>
              <th>ГиКС</th>
              <th>Роль</th>
              <th>Статус</th>
              <th className="text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            {db.users.map((u) => (
              <tr key={u.login}>
                <td>
                  <div className="font-semibold text-[var(--txt)]">{u.name}</div>
                  <div className="mono text-[10px] text-[var(--dim)]">{u.login} • с {fmtDate(u.createdAt)}</div>
                </td>
                <td className="mono text-[11px] text-[var(--gold2)]">{u.itirinio}</td>
                <td className="mono text-[12px]">{u.giks}</td>
                <td className="text-[12px] text-[var(--txt2)]">{ROLE_LABEL[u.role]}</td>
                <td>
                  {u.blocked ? (
                    <span className="chip chip-red">заблокирован</span>
                  ) : (
                    <span className="chip" style={{ color: "var(--gold2)", borderColor: "rgba(212,175,55,.5)" }}>
                      в строю
                    </span>
                  )}
                </td>
                <td>
                  <div className="flex justify-end gap-1">
                    <IconBtn title="Изменить досье (имя, IŦirinio, пароль)" onClick={() => setEditing(u)}>
                      <IcDoc size={14} />
                    </IconBtn>
                    <IconBtn title="Перевыпустить пароль" onClick={() => onNewPass(resetPassword(u.login))}>
                      <IcKey size={14} />
                    </IconBtn>
                    {u.role !== "root" && (
                      <>
                        <IconBtn
                          title={u.blocked ? "Разблокировать" : "Заблокировать"}
                          danger={!u.blocked}
                          onClick={() => {
                            setBlocked(u.login, !u.blocked);
                            toast(u.blocked ? "Учётная запись разблокирована" : "Учётная запись заблокирована", u.blocked ? "ok" : "info");
                          }}
                        >
                          {u.blocked ? <IcCheck size={14} /> : <IcBan size={14} />}
                        </IconBtn>
                        <IconBtn
                          title="Аннулировать паспорт"
                          danger
                          onClick={() => {
                            if (window.confirm(`Аннулировать паспорт ${u.itirinio} (${u.name})? Действие необратимо.`)) {
                              const err = deleteUser(u.login);
                              toast(err ?? "Паспорт аннулирован", err ? "err" : "info");
                            }
                          }}
                        >
                          <IcTrash size={14} />
                        </IconBtn>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && <EditUserModal user={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

/* ---------- правка досье ---------- */

function EditUserModal({ user, onClose }: { user: User; onClose: () => void }) {
  const [name, setName] = useState(user.name);
  const [it, setIt] = useState(user.itirinio);
  const [role, setRole] = useState<Role>(user.role);
  const [pref, setPref] = useState(user.pref);
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isRoot = user.role === "root";

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const uErr = updateUser(user.login, { name, itirinio: it, role, pref });
    if (uErr) return setErr(uErr);
    if (password.trim()) {
      const pErr = setPasswordManual(user.login, password.trim());
      if (pErr) return setErr(pErr);
    }
    toast("Досье обновлено и внесено в журнал аудита");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onClick={onClose}>
      <form onSubmit={save} className="panel w-full max-w-md border-[rgba(212,175,55,.5)] p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="display text-lg font-bold text-[var(--gold2)]">ПРАВКА ДОСЬЕ</h3>
            <p className="mono mt-0.5 text-[10px] tracking-[0.2em] text-[var(--dim)]">ЛОГИН: {user.login}</p>
          </div>
          <button type="button" onClick={onClose} className="text-[var(--dim)] hover:text-[var(--red3)]">
            <IcX size={18} />
          </button>
        </div>
        <div className="goldline my-4" />

        <label className="mono text-[10px] tracking-[0.2em] text-[var(--dim)]">ИМЯ</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="field mt-1" />

        <label className="mono mt-3 block text-[10px] tracking-[0.2em] text-[var(--dim)]">IŦIRINIO (НОМЕР ПАСПОРТА)</label>
        <input
          value={it}
          onChange={(e) => setIt(formatItirinio(e.target.value))}
          className="field mono mt-1"
          placeholder="000000000000-000000000000"
        />

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mono text-[10px] tracking-[0.2em] text-[var(--dim)]">СОСЛОВИЕ</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="field mt-1"
              disabled={isRoot}
              title={isRoot ? "Сословие Императорского Дома неизменно" : undefined}
            >
              <option value="citizen">Ťivitano (17-…)</option>
              <option value="legal">Юридическое лицо (23-…)</option>
              <option value="operator">Оператор Коллегии (12-…)</option>
              <option value="tech">Тех. специалист (24-12-…)</option>
              <option value="moderator">Модератор (24-01-…)</option>
              {isRoot && <option value="root">Император (12-001)</option>}
            </select>
          </div>
          {role === "citizen" && (
            <div>
              <label className="mono text-[10px] tracking-[0.2em] text-[var(--dim)]">ПРЕФЕКТУРА</label>
              <select value={pref} onChange={(e) => setPref(e.target.value)} className="field mt-1">
                {PREFS.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <label className="mono mt-3 block text-[10px] tracking-[0.2em] text-[var(--dim)]">
          НОВЫЙ ПАРОЛЬ (НЕОБЯЗАТЕЛЬНО)
        </label>
        <div className="relative mt-1">
          <input
            type={showPass ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field mono pr-10"
            placeholder="оставьте пустым — без изменений"
          />
          <button
            type="button"
            onClick={() => setShowPass((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--dim)] hover:text-[var(--gold2)]"
            title={showPass ? "Скрыть" : "Показать"}
          >
            {showPass ? <IcEyeOff size={14} /> : <IcEye size={14} />}
          </button>
        </div>

        {err && <p className="mono mt-3 border border-[var(--red2)] bg-[rgba(139,0,0,.15)] px-3 py-2 text-[11.5px] text-[var(--red3)]">{err}</p>}

        <p className="mono mt-3 text-[9.5px] leading-4 text-[var(--dim)]">
          ПРИ СМЕНЕ СОСЛОВИЯ ИЛИ ПРЕФЕКТУРЫ НОМЕР ГИКС ПЕРЕВЫПУСКАЕТСЯ АВТОМАТИЧЕСКИ. ТЕКУЩИЙ: {user.giks}
        </p>

        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClose} className="btn flex-1">Отмена</button>
          <button type="submit" className="btn btn-gold flex-1">Сохранить</button>
        </div>
      </form>
    </div>
  );
}

/* ---------- регистрация ЮЛ (оператор Коллегии) ---------- */

function OperatorTab({ onIssued }: { onIssued: (u: User) => void }) {
  const db = useDB();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const legals = db.users.filter((u) => u.role === "legal");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = createUser({ name, role: "legal", password, pref: "00" });
    if (res.err) toast(res.err, "err");
    else if (res.user) {
      onIssued(res.user);
      setName("");
      setPassword("");
    }
  };

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-[380px_1fr]">
      <form onSubmit={submit} className="panel h-fit p-5">
        <h3 className="display flex items-center gap-2 text-sm font-bold tracking-wider">
          <IcUsers size={15} className="text-[var(--gold)]" /> РЕГИСТРАЦИЯ ЮРИДИЧЕСКОГО ЛИЦА
        </h3>
        <div className="goldline my-3" />
        <label className="mono text-[10px] tracking-[0.2em] text-[var(--dim)]">НАИМЕНОВАНИЕ</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="field mt-1" placeholder="Торговый дом «Наго»" />
        <label className="mono mt-3 block text-[10px] tracking-[0.2em] text-[var(--dim)]">ПАРОЛЬ</label>
        <input value={password} onChange={(e) => setPassword(e.target.value)} className="field mono mt-1" placeholder="••••••" />
        <button className="btn btn-gold mt-4 w-full">Зарегистрировать (номер 23-…)</button>
        <p className="mono mt-2 text-[9.5px] leading-4 text-[var(--dim)]">
          ПОЛНОМОЧИЯ ОПЕРАТОРА: ТОЛЬКО ЮРИДИЧЕСКИЕ ЛИЦА. ПАСПОРТА ГРАЖДАНАМ ВЫДАЁТ ВЕРХОВНЫЙ АДМИНИСТРАТОР.
        </p>
      </form>
      <div className="panel overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              <th>Юридическое лицо</th>
              <th>IŦirinio</th>
              <th>ГиКС</th>
              <th>Регистрация</th>
            </tr>
          </thead>
          <tbody>
            {legals.map((u) => (
              <tr key={u.login}>
                <td className="font-semibold">{u.name}</td>
                <td className="mono text-[11px] text-[var(--gold2)]">{u.itirinio}</td>
                <td className="mono text-[12px]">{u.giks}</td>
                <td className="mono text-[11px] text-[var(--txt2)]">{fmtDate(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- доменные зоны ---------- */

function ZonesTab() {
  const db = useDB();
  const [tld, setTld] = useState("");
  const [desc, setDesc] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = createZone(tld, desc);
    if (err) toast(err, "err");
    else {
      toast(`Доменная зона .${tld.trim().toLowerCase().replace(/^\./, "")} выделена`);
      setTld("");
      setDesc("");
    }
  };

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-[380px_1fr]">
      <form onSubmit={submit} className="panel h-fit p-5">
        <h3 className="display flex items-center gap-2 text-sm font-bold tracking-wider">
          <IcGlobe size={15} className="text-[var(--gold)]" /> ВЫДЕЛЕНИЕ ДОМЕННОЙ ЗОНЫ
        </h3>
        <div className="goldline my-3" />
        <label className="mono text-[10px] tracking-[0.2em] text-[var(--dim)]">ИМЯ ЗОНЫ</label>
        <div className="mt-1 flex items-center">
          <span className="display border border-r-0 border-[var(--line)] bg-[#0a0a0a] px-2.5 py-2.5 text-sm text-[var(--gold)]">.</span>
          <input
            value={tld}
            onChange={(e) => setTld(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            className="field"
            placeholder="mil"
          />
        </div>
        <label className="mono mt-3 block text-[10px] tracking-[0.2em] text-[var(--dim)]">НАЗНАЧЕНИЕ</label>
        <input value={desc} onChange={(e) => setDesc(e.target.value)} className="field mt-1" placeholder="Военный контур Империи" />
        <button className="btn btn-gold mt-4 w-full">Выделить зону</button>
        <p className="mono mt-2 text-[9.5px] leading-4 text-[var(--dim)]">
          ВНУТРИ ЗОНЫ ЗАТЕМ ВЫДЕЛЯЮТСЯ ИМЕНА (UZEЛ.ZONA). ЗОНЫ .ARG И .ANCT УЧРЕЖДЕНЫ УКАЗОМ №17 И НЕ УПРАЗДНЯЮТСЯ.
        </p>
      </form>

      <div className="panel overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              <th>Зона</th>
              <th>Назначение</th>
              <th>Доменов</th>
              <th>Учреждена</th>
              <th className="text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            {db.zones.map((z) => {
              const count = db.domains.filter((d) => d.tld === z.tld).length;
              return (
                <tr key={z.tld}>
                  <td className="display text-base font-bold text-[var(--gold2)]">.{z.tld}</td>
                  <td className="text-[12.5px] text-[var(--txt2)]">{z.desc}</td>
                  <td className="mono">{count}</td>
                  <td className="mono text-[11px] text-[var(--txt2)]">{fmtDate(z.createdAt)}</td>
                  <td className="text-right">
                    {z.system ? (
                      <span className="chip">указ №17</span>
                    ) : (
                      <IconBtn
                        title="Упразднить зону"
                        danger
                        onClick={() => {
                          if (window.confirm(`Упразднить доменную зону .${z.tld}?`)) {
                            const err = deleteZone(z.tld);
                            toast(err ?? `Зона .${z.tld} упразднена`, err ? "err" : "info");
                          }
                        }}
                      >
                        <IcTrash size={14} />
                      </IconBtn>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- домены ---------- */

function DomainsTab() {
  const db = useDB();
  const [name, setName] = useState("");
  const [tld, setTld] = useState("arg");
  const [port, setPort] = useState(() => nextPort(db.domains.map((d) => d.port)));
  const [owner, setOwner] = useState("krol");
  const [desc, setDesc] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = registerDomain({ name, tld, port: Number(port), owner, desc });
    if (err) toast(err, "err");
    else {
      toast(`Домен ${name.trim().toLowerCase()}.${tld} выделен (порт ${port})`);
      setName("");
      setDesc("");
      setPort(nextPort([...db.domains.map((d) => d.port), Number(port)]));
    }
  };

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-[380px_1fr]">
      <form onSubmit={submit} className="panel h-fit p-5">
        <h3 className="display flex items-center gap-2 text-sm font-bold tracking-wider">
          <IcGlobe size={15} className="text-[var(--gold)]" /> ВЫДЕЛЕНИЕ ДОМЕНА
        </h3>
        <div className="goldline my-3" />
        <label className="mono text-[10px] tracking-[0.2em] text-[var(--dim)]">ИМЯ (ДО ТОЧКИ)</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
          className="field mono mt-1"
          placeholder="obolensk"
        />
        <label className="mono mt-3 block text-[10px] tracking-[0.2em] text-[var(--dim)]">ДОМЕННАЯ ЗОНА</label>
        <select value={tld} onChange={(e) => setTld(e.target.value)} className="field mt-1">
          {db.zones.map((z) => (
            <option key={z.tld} value={z.tld}>
              .{z.tld} — {z.desc}
            </option>
          ))}
        </select>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mono text-[10px] tracking-[0.2em] text-[var(--dim)]">ПОРТ УЗЛА</label>
            <input type="number" value={port} onChange={(e) => setPort(Number(e.target.value))} className="field mono mt-1" />
          </div>
          <div>
            <label className="mono text-[10px] tracking-[0.2em] text-[var(--dim)]">ВЛАДЕЛЕЦ</label>
            <select value={owner} onChange={(e) => setOwner(e.target.value)} className="field mt-1">
              {db.users.map((u) => (
                <option key={u.login} value={u.login}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <label className="mono mt-3 block text-[10px] tracking-[0.2em] text-[var(--dim)]">ОПИСАНИЕ</label>
        <input value={desc} onChange={(e) => setDesc(e.target.value)} className="field mt-1" placeholder="Родовой архив" />
        <button className="btn btn-gold mt-4 w-full">Выделить адрес</button>
        <p className="mono mt-2 text-[9.5px] leading-4 text-[var(--dim)]">
          ВЫДЕЛЯЕТСЯ АДРЕС С ПОРТОМ. СЛУЖБА ПОЯВИТСЯ, КОГДА ВЛАДЕЛЕЦ РАЗМЕСТИТ СВОЙ ПРОЕКТ НА УЗЛЕ.
        </p>
      </form>

      <div className="panel overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              <th>Домен</th>
              <th>Назначение</th>
              <th>Владелец</th>
              <th>Порт</th>
              <th>Состояние</th>
              <th className="text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            {db.domains.map((d) => (
              <tr key={domainFull(d)}>
                <td>
                  <span className={`mono font-semibold ${d.tld === "arg" ? "text-[var(--gold2)]" : "text-[var(--red3)]"}`}>
                    {domainFull(d)}
                  </span>
                  {d.mirror && <span className="chip ml-2">зеркало</span>}
                </td>
                <td className="max-w-[220px] truncate text-[12px] text-[var(--txt2)]">{d.desc}</td>
                <td className="mono text-[11px] text-[var(--txt2)]">{d.owner}</td>
                <td className="mono">{d.port}</td>
                <td>
                  {d.hosted && d.kind !== "reserved" ? (
                    <span className="chip" style={{ color: "var(--gold2)", borderColor: "rgba(212,175,55,.5)" }}>в строю</span>
                  ) : (
                    <span className="chip">адрес выделен</span>
                  )}
                </td>
                <td className="text-right">
                  {d.system ? (
                    <span className="chip">указ №17</span>
                  ) : (
                    <IconBtn
                      title="Отозвать домен"
                      danger
                      onClick={() => {
                        if (window.confirm(`Отозвать домен ${domainFull(d)} из реестра?`)) {
                          const err = deleteDomain(domainFull(d));
                          toast(err ?? `Домен ${domainFull(d)} отозван`, err ? "err" : "info");
                        }
                      }}
                    >
                      <IcTrash size={14} />
                    </IconBtn>
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

function nextPort(ports: number[]): number {
  let p = 8011;
  while (ports.includes(p)) p++;
  return p;
}

/* ---------- журнал ---------- */

function LogTab() {
  const db = useDB();
  return (
    <div className="panel mt-6 max-h-[520px] overflow-y-auto p-2">
      {db.log.map((l, i) => (
        <div key={i} className="mono flex gap-4 border-b border-[var(--line)] px-3 py-2 text-[12px] last:border-0">
          <span className="shrink-0 text-[var(--dim)]">{fmtDT(l.ts)}</span>
          <span className="text-[var(--txt2)]">{l.text}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- API ---------- */

function ApiTab() {
  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      <div className="panel p-5">
        <h3 className="display text-sm font-bold tracking-wider">СХЕМА БОЕВОГО КОНТУРА (PYTHONANYWHERE / СЕРВЕР)</h3>
        <div className="goldline my-3" />
        <pre className="mono overflow-x-auto text-[11px] leading-5 text-[var(--txt2)]">
{`Браузер подданного
  └─ nginx (обратный прокси, Host → порт)
       ├─ login.arg     : 8000  Django (SSO по IŦirinio)
       ├─ sb.arg        : 8001  Django StatusBanko
       ├─ gnicst.anct   : 8002  Django ГНИЦСТ (Ваш проект)
       ├─ post.arg      : 8003  Django КЭП
       ├─ call.arg      : 8004  Django ГИКС (сигнализация)
       ├─ kance.arg     : 8005  Django Канцелярия + REST API
       ├─ krg.arg       : 8009  этот фронтенд
       └─ …
  Локальный DNS (dnsmasq): *.arg, *.anct → 127.0.0.1`}
        </pre>
      </div>
      <div className="panel p-5">
        <h3 className="display text-sm font-bold tracking-wider">REST API КАНЦЕЛЯРИИ • {API_BASE || "ЛОКАЛЬНЫЙ РЕЖИМ"}</h3>
        <div className="goldline my-3" />
        <p className="text-[12px] leading-relaxed text-[var(--txt2)]">
          Прототип хранит реестр в браузере. При установке флага <span className="mono text-[var(--gold2)]">USE_REMOTE</span> в
          src/lib/api.ts все действия переключаются на Django REST Framework:
        </p>
        <div className="mt-3 max-h-[340px] overflow-y-auto">
          {API_ENDPOINTS.map((e) => (
            <div key={e.m + e.p} className="mono flex items-center gap-2 border-b border-[var(--line)] py-1.5 text-[11px] last:border-0">
              <span className={`chip ${["POST", "DELETE"].includes(e.m) ? "chip-red" : "chip-gold"}`}>{e.m}</span>
              <span className="text-[var(--txt2)]">{e.p}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function IconBtn({
  children,
  title,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center border transition-colors ${
        danger
          ? "border-[rgba(139,0,0,.5)] text-[var(--red3)] hover:border-[var(--red2)] hover:bg-[rgba(139,0,0,.16)]"
          : "border-[var(--line2)] text-[var(--txt2)] hover:border-[var(--gold)] hover:text-[var(--gold2)]"
      }`}
    >
      {children}
    </button>
  );
}
