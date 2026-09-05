import { useState } from "react";
import {
  useDB,
  createUser,
  deleteUser,
  resetPassword,
  registerDomain,
  deleteDomain,
  domainFull,
  KIND_LABEL,
  fmtDate,
  fmtDT,
  toast,
  type Role,
  type Tld,
  type SiteKind,
  type User,
} from "../../lib/db";
import { IcCrown, IcGlobe, IcKey, IcLock, IcNode, IcPlus, IcShield, IcTrash, IcUsers } from "../../lib/icons";

type Tab = "users" | "domains" | "net";

const REG_KINDS: SiteKind[] = ["stub", "mail", "voip", "news", "empire", "registry"];

export default function AdminSite({ user, nav }: { user: User; nav: (h: string) => void }) {
  const db = useDB();
  const [tab, setTab] = useState<Tab>("users");

  // форма подданного
  const [nLogin, setNLogin] = useState("");
  const [nName, setNName] = useState("");
  const [nPass, setNPass] = useState("");
  const [nRole, setNRole] = useState<Role>("citizen");

  // форма домена
  const [dName, setDName] = useState("");
  const [dTld, setDTld] = useState<Tld>("anct");
  const [dKind, setDKind] = useState<SiteKind>("stub");
  const [dDesc, setDDesc] = useState("");

  const submitUser = (e: React.FormEvent) => {
    e.preventDefault();
    const err = createUser({ login: nLogin, name: nName, password: nPass, role: nRole });
    if (err) {
      toast(err, "err");
      return;
    }
    toast(`Подданный ${nLogin.toLowerCase()} внесён в реестр, номер выдан автоматически`);
    setNLogin("");
    setNName("");
    setNPass("");
  };

  const submitDomain = (e: React.FormEvent) => {
    e.preventDefault();
    const err = registerDomain({ name: dName, tld: dTld, kind: dKind, owner: user.login, desc: dDesc });
    if (err) {
      toast(err, "err");
      return;
    }
    toast(`Домен ${dName.toLowerCase()}.${dTld} жалован — узел уже в реестре`);
    setDName("");
    setDDesc("");
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <div className="fadeUp flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center border border-[var(--brass)] bg-[rgba(201,163,92,.08)]">
            <IcCrown size={24} className="text-[var(--brass)]" />
          </span>
          <div>
            <h1 className="display text-2xl tracking-wide sm:text-3xl">ИМПЕРСКАЯ КАНЦЕЛЯРИЯ</h1>
            <p className="mono mt-1 text-[10px] tracking-[0.25em] text-[var(--dim)]">
              UPRAVLENIE.ARG • ПОЛНЫЙ КОНТРОЛЬ НАД АРГОНЕТОМ
            </p>
          </div>
        </div>
        <span className="chip chip-arg">сеанс: {user.login} • администратор</span>
      </div>

      {/* вкладки */}
      <div className="mt-7 flex gap-1 border-b border-[var(--line)]">
        {(
          [
            { id: "users", label: "Подданные", icon: <IcUsers size={15} /> },
            { id: "domains", label: "Домены", icon: <IcGlobe size={15} /> },
            { id: "net", label: "Сеть и журнал", icon: <IcNode size={15} /> },
          ] as Array<{ id: Tab; label: string; icon: React.ReactNode }>
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-[12.5px] font-semibold uppercase tracking-[0.08em] transition-all ${
              tab === t.id
                ? "border-[var(--brass)] text-[var(--brass2)]"
                : "border-transparent text-[var(--txt2)] hover:text-[var(--txt)]"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ПОДДАННЫЕ */}
      {tab === "users" && (
        <div className="siteIn mt-6 grid gap-4 lg:grid-cols-[340px_1fr]">
          <form onSubmit={submitUser} className="panel h-fit p-5">
            <h3 className="mono flex items-center gap-2 text-[10px] tracking-[0.25em] text-[var(--dim)]">
              <IcPlus size={13} /> НОВЫЙ ПОДДАННЫЙ
            </h3>
            <div className="mt-3 space-y-3">
              <div>
                <label className="mono mb-1 block text-[10px] tracking-[0.2em] text-[var(--dim)]">ЛОГИН</label>
                <input className="field mono" value={nLogin} onChange={(e) => setNLogin(e.target.value)} placeholder="suvorov" />
              </div>
              <div>
                <label className="mono mb-1 block text-[10px] tracking-[0.2em] text-[var(--dim)]">ИМЯ</label>
                <input className="field" value={nName} onChange={(e) => setNName(e.target.value)} placeholder="А. Суворов-Рымникский" />
              </div>
              <div>
                <label className="mono mb-1 block text-[10px] tracking-[0.2em] text-[var(--dim)]">ПАРОЛЬ</label>
                <div className="flex gap-2">
                  <input className="field mono" value={nPass} onChange={(e) => setNPass(e.target.value)} placeholder="не менее 6 знаков" />
                  <button
                    type="button"
                    className="btn shrink-0 px-3"
                    onClick={() => setNPass(`arg-${Math.floor(1000 + Math.random() * 9000)}`)}
                    title="Сгенерировать пароль"
                  >
                    <IcKey size={15} />
                  </button>
                </div>
              </div>
              <div>
                <label className="mono mb-1 block text-[10px] tracking-[0.2em] text-[var(--dim)]">СТАТУС</label>
                <select className="field" value={nRole} onChange={(e) => setNRole(e.target.value as Role)}>
                  <option value="citizen">Подданный — почта и Аргфон</option>
                  <option value="admin">Администратор — доступ в Канцелярию</option>
                </select>
              </div>
              <button type="submit" className="btn btn-brass w-full">
                <IcPlus size={15} /> Внести в реестр
              </button>
              <p className="mono text-[10px] leading-5 text-[var(--dim)]">
                Пароли в прототипе хранятся открыто в браузере. В боевом контуре — bcrypt в базе Flask-узла.
              </p>
            </div>
          </form>

          <div className="panel overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Логин</th>
                  <th>Имя</th>
                  <th>Статус</th>
                  <th>Номер</th>
                  <th>Пароль</th>
                  <th>В реестре с</th>
                  <th className="text-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                {db.users.map((u) => (
                  <tr key={u.login}>
                    <td className="mono text-[var(--brass2)]">{u.login}</td>
                    <td className="text-[var(--txt)]">{u.name}</td>
                    <td>
                      <span className={`chip ${u.role === "admin" ? "chip-arg" : "chip-anct"}`}>
                        {u.role === "admin" ? "админ" : "подданный"}
                      </span>
                    </td>
                    <td className="mono text-[var(--txt2)]">А-{u.phone}</td>
                    <td className="mono text-[12px] text-[var(--dim)]">{u.password}</td>
                    <td className="mono text-[12px] text-[var(--txt2)]">{fmtDate(u.createdAt)}</td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <button
                          className="btn px-2 py-1.5"
                          title="Выдать новый пароль"
                          onClick={() => {
                            const p = resetPassword(u.login);
                            toast(`Новый пароль для ${u.login}: ${p}`, "info");
                          }}
                        >
                          <IcKey size={14} />
                        </button>
                        <button
                          className="btn btn-danger px-2 py-1.5"
                          title={u.login === user.login ? "Нельзя исключить самого себя" : "Исключить из реестра"}
                          disabled={u.login === user.login || u.login === "imperator"}
                          onClick={() => {
                            const err = deleteUser(u.login);
                            if (err) toast(err, "err");
                            else toast(`Подданный ${u.login} исключён из реестра`, "err");
                          }}
                        >
                          <IcTrash size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ДОМЕНЫ */}
      {tab === "domains" && (
        <div className="siteIn mt-6 grid gap-4 lg:grid-cols-[340px_1fr]">
          <form onSubmit={submitDomain} className="panel h-fit p-5">
            <h3 className="mono flex items-center gap-2 text-[10px] tracking-[0.25em] text-[var(--dim)]">
              <IcPlus size={13} /> ЖАЛОВАНИЕ ДОМЕНА
            </h3>
            <div className="mt-3 space-y-3">
              <div>
                <label className="mono mb-1 block text-[10px] tracking-[0.2em] text-[var(--dim)]">ИМЯ + ЗОНА</label>
                <div className="flex gap-2">
                  <input
                    className="field mono"
                    value={dName}
                    onChange={(e) => setDName(e.target.value.toLowerCase())}
                    placeholder="kazna"
                  />
                  <select className="field mono w-28 shrink-0" value={dTld} onChange={(e) => setDTld(e.target.value as Tld)}>
                    <option value="arg">.arg</option>
                    <option value="anct">.anct</option>
                  </select>
                </div>
                <p className="mono mt-1.5 text-[11px] text-[var(--verd2)]">
                  будет зарегистрирован: {(dName || "имя")}.{dTld}
                </p>
              </div>
              <div>
                <label className="mono mb-1 block text-[10px] tracking-[0.2em] text-[var(--dim)]">НАЗНАЧЕНИЕ УЗЛА</label>
                <select className="field" value={dKind} onChange={(e) => setDKind(e.target.value as SiteKind)}>
                  {REG_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {KIND_LABEL[k]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mono mb-1 block text-[10px] tracking-[0.2em] text-[var(--dim)]">ОПИСАНИЕ</label>
                <input className="field" value={dDesc} onChange={(e) => setDDesc(e.target.value)} placeholder="Чем ведает служба" />
              </div>
              <button type="submit" className="btn btn-brass w-full">
                <IcGlobe size={15} /> Зарегистрировать
              </button>
              <p className="mono text-[10px] leading-5 text-[var(--dim)]">
                Узел тотчас появится в реестре и станет доступен по имени в адресной строке.
              </p>
            </div>
          </form>

          <div className="panel overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Домен</th>
                  <th>Назначение</th>
                  <th>Владелец</th>
                  <th>Жалован</th>
                  <th className="text-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                {db.domains.map((d) => {
                  const protected_ = d.system || d.kind === "admin";
                  return (
                    <tr key={domainFull(d)}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className={`mono font-semibold ${d.tld === "arg" ? "text-[var(--brass2)]" : "text-[var(--verd2)]"}`}>
                            {domainFull(d)}
                          </span>
                          {d.system && <span className="chip chip-arg">указ</span>}
                        </div>
                        <div className="mt-0.5 max-w-64 truncate text-[11px] text-[var(--dim)]">{d.desc}</div>
                      </td>
                      <td className="text-[var(--txt2)]">{KIND_LABEL[d.kind]}</td>
                      <td className="mono text-[12px] text-[var(--txt2)]">{d.owner}</td>
                      <td className="mono text-[12px] text-[var(--txt2)]">{fmtDate(d.createdAt)}</td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <button className="btn px-2 py-1.5" title="Открыть узел" onClick={() => nav(domainFull(d))}>
                            ↗
                          </button>
                          {protected_ ? (
                            <span className="flex h-8 w-8 items-center justify-center border border-[var(--line)] text-[var(--dim)]" title="Защищён указом">
                              <IcLock size={14} />
                            </span>
                          ) : (
                            <button
                              className="btn btn-danger px-2 py-1.5"
                              title="Исключить из реестра"
                              onClick={() => {
                                const err = deleteDomain(domainFull(d));
                                if (err) toast(err, "err");
                                else toast(`Домен ${domainFull(d)} исключён из реестра`, "err");
                              }}
                            >
                              <IcTrash size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* СЕТЬ */}
      {tab === "net" && (
        <div className="siteIn mt-6 grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                { l: "узлов в строю", v: "12" },
                { l: "MTU тракта", v: "1450" },
                { l: "шифр", v: "АРГ-256" },
                { l: "разрешение имён", v: "DNS.ARG" },
                { l: "аптайм", v: "99,7%" },
                { l: "версия узла", v: "0.9.3" },
              ].map((s) => (
                <div key={s.l} className="panel p-4">
                  <div className="display text-lg text-[var(--brass2)]">{s.v}</div>
                  <div className="mono mt-1 text-[9.5px] uppercase tracking-[0.15em] text-[var(--dim)]">{s.l}</div>
                </div>
              ))}
            </div>
            <div className="panel p-5">
              <h3 className="mono flex items-center gap-2 text-[10px] tracking-[0.25em] text-[var(--dim)]">
                <IcShield size={13} /> ПАМЯТКА ПО БОЕВОМУ КОНТУРУ (PYTHONANYWHERE)
              </h3>
              <ul className="mono mt-3 space-y-2 text-[11.5px] leading-5 text-[var(--txt2)]">
                <li>— Flask + SQLite: таблицы users, domains, emails, calls, log.</li>
                <li>— Сессии — flask-login, пароли — bcrypt, аккаунты создаёт только админ.</li>
                <li>— Домены — строки в БД; роутер Flask отдаёт «сайты» по имени из Host.</li>
                <li>— VoIP: WebRTC между браузерами; сигналинг — короткие опросы (WebSocket на бесплатном тарифе нет).</li>
                <li>— Этот интерфейс подключается к API без переделки вёрстки.</li>
              </ul>
            </div>
          </div>

          <div className="panel p-5">
            <h3 className="mono flex items-center gap-2 text-[10px] tracking-[0.25em] text-[var(--dim)]">
              <IcNode size={13} /> ЖУРНАЛ СОБЫТИЙ СЕТИ
            </h3>
            <div className="mt-3 max-h-105 space-y-0 overflow-y-auto pr-1">
              {db.log.map((e, i) => (
                <div key={i} className="flex gap-3 border-b border-[var(--line)] py-1.5 last:border-0">
                  <span className="mono shrink-0 text-[10.5px] text-[var(--dim)]">{fmtDT(e.ts)}</span>
                  <span className="text-[12px] text-[var(--txt2)]">{e.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
