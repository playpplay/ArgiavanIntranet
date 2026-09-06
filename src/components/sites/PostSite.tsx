import { useMemo, useState } from "react";
import {
  useDB,
  mailFor,
  markRead,
  purgeMail,
  sendMail,
  setTrashed,
  toast,
  userByLogin,
  userName,
  fmtDT,
  type EmailMsg,
  type User,
} from "../../lib/db";
import { IcInbox, IcMail, IcOutbox, IcReply, IcSend, IcTrash, IcX } from "../../lib/icons";

type Folder = "in" | "out" | "trash";
type View = { mode: "list" } | { mode: "read"; msg: EmailMsg } | { mode: "compose"; replyTo?: EmailMsg };

const FOLDERS: Array<{ id: Folder; label: string; icon: React.ReactNode }> = [
  { id: "in", label: "Входящие", icon: <IcInbox size={15} /> },
  { id: "out", label: "Отправленные", icon: <IcOutbox size={15} /> },
  { id: "trash", label: "Корзина", icon: <IcTrash size={15} /> },
];

function who(login: string): string {
  const u = userByLogin(login);
  return u ? `${u.name} (${u.itirinio})` : login;
}

export default function PostSite({ user }: { user: User }) {
  useDB();
  const [folder, setFolder] = useState<Folder>("in");
  const [view, setView] = useState<View>({ mode: "list" });
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const list = mailFor(user.login, folder);
  const users = useDB().users.filter((u) => u.login !== user.login);

  const counts = useMemo(
    () => ({
      in: mailFor(user.login, "in").length,
      out: mailFor(user.login, "out").length,
      trash: mailFor(user.login, "trash").length,
    }),
    // пересчёт на каждом рендере хранилища
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [useDB(), user.login]
  );

  const openMsg = (m: EmailMsg) => {
    if (folder === "in" && !m.read) markRead(m.id);
    setView({ mode: "read", msg: m });
  };

  const startCompose = (replyTo?: EmailMsg) => {
    setErr(null);
    setTo(replyTo ? replyTo.from : "");
    setSubject(replyTo ? `Re: ${replyTo.subject.replace(/^Re: /, "")}` : "");
    setBody("");
    setView({ mode: "compose", replyTo });
  };

  const doSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!to) return setErr("Укажите получателя по Iŧirinio");
    if (!body.trim()) return setErr("Содержимое депеши пусто");
    sendMail(user.login, to, subject, body);
    toast(`Депеша доставлена: ${userName(to)} (КЭП, post.arg)`);
    setView({ mode: "list" });
    setFolder("out");
  };

  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="display text-2xl font-extrabold tracking-wide">
            КЭП — КОРОЛЕВСКАЯ <span className="text-[var(--gold)]">ЭЛЕКТРОННАЯ ПОЧТА</span>
          </h1>
          <p className="mono mt-1 text-[10px] tracking-[0.22em] text-[var(--dim)]">
            POST.ARG • ПОРТ 8003 • ЯЩИК: {user.itirinio}
          </p>
        </div>
        {view.mode !== "compose" && (
          <button className="btn btn-gold" onClick={() => startCompose()}>
            <IcSend size={14} /> Новая депеша
          </button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        {/* папки */}
        <div className="flex shrink-0 gap-1.5 lg:w-52 lg:flex-col">
          {FOLDERS.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                setFolder(f.id);
                setView({ mode: "list" });
              }}
              className={`flex flex-1 items-center gap-2.5 border px-3.5 py-2.5 text-[12px] font-semibold uppercase tracking-wider transition-all lg:flex-none ${
                folder === f.id
                  ? "border-[var(--gold)] bg-[rgba(212,175,55,.08)] text-[var(--gold2)]"
                  : "border-[var(--line)] text-[var(--txt2)] hover:border-[var(--line2)] hover:text-[var(--txt)]"
              }`}
            >
              {f.icon}
              {f.label}
              <span className="mono ml-auto text-[10px] text-[var(--dim)]">{counts[f.id]}</span>
            </button>
          ))}
          <div className="panel hidden flex-1 p-3.5 lg:block">
            <p className="mono text-[9.5px] leading-5 tracking-[0.12em] text-[var(--dim)]">
              СОГЛАСНО СТ. 1 (187) КГТ ВСЕ ДЕПЕШИ АРХИВИРУЮТСЯ И АНАЛИЗИРУЮТСЯ ГНИЦСТ. ТАЙНА ПЕРЕПИСКИ — СТ.
              13.1 (22) TOQORRO.
            </p>
          </div>
        </div>

        {/* содержимое */}
        <div className="panel min-h-0 flex-1 overflow-y-auto">
          {view.mode === "list" && (
            <div>
              {list.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center py-20 text-center">
                  <IcMail size={30} className="text-[var(--dim)]" />
                  <p className="mono mt-3 text-[11px] tracking-[0.2em] text-[var(--dim)]">ДЕПЕШЕЙ НЕТ</p>
                </div>
              )}
              {list.map((m) => {
                const counterpart = folder === "out" ? m.to : m.from;
                return (
                  <div
                    key={m.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openMsg(m)}
                    onKeyDown={(e) => e.key === "Enter" && openMsg(m)}
                    className={`group flex cursor-pointer items-center gap-3 border-b border-[var(--line)] px-4 py-3 transition-colors hover:bg-[rgba(212,175,55,.04)] ${
                      !m.read && folder === "in" ? "bg-[rgba(139,0,0,.06)]" : ""
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${!m.read && folder === "in" ? "bg-[var(--red3)]" : "bg-transparent"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className={`truncate text-[13px] ${!m.read && folder === "in" ? "font-bold text-[var(--txt)]" : "font-semibold text-[var(--txt2)]"}`}>
                          {folder === "out" ? "Кому: " : ""}
                          {who(counterpart)}
                        </span>
                      </div>
                      <div className={`truncate text-[12.5px] ${!m.read && folder === "in" ? "font-semibold text-[var(--txt)]" : "text-[var(--txt2)]"}`}>
                        {m.subject}
                      </div>
                      <div className="truncate text-[11.5px] text-[var(--dim)]">{m.body.split("\n")[0]}</div>
                    </div>
                    <span className="mono shrink-0 text-[10px] text-[var(--dim)]">{fmtDT(m.ts)}</span>
                  </div>
                );
              })}
            </div>
          )}

          {view.mode === "read" && (
            <div className="siteIn flex h-full flex-col p-5">
              <div className="flex items-center gap-2">
                <button className="btn px-3 py-2 text-[10.5px]" onClick={() => setView({ mode: "list" })}>
                  ← К списку
                </button>
                {folder !== "trash" ? (
                  <>
                    <button
                      className="btn px-3 py-2 text-[10.5px]"
                      onClick={() => {
                        setTrashed(view.msg.id, true);
                        setView({ mode: "list" });
                        toast("Депеша перемещена в корзину", "info");
                      }}
                    >
                      <IcTrash size={13} /> В корзину
                    </button>
                    {folder === "in" && (
                      <button className="btn btn-gold px-3 py-2 text-[10.5px]" onClick={() => startCompose(view.msg)}>
                        <IcReply size={13} /> Ответить
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      className="btn px-3 py-2 text-[10.5px]"
                      onClick={() => {
                        setTrashed(view.msg.id, false);
                        setView({ mode: "list" });
                        toast("Депеша восстановлена", "info");
                      }}
                    >
                      Восстановить
                    </button>
                    <button
                      className="btn btn-danger px-3 py-2 text-[10.5px]"
                      onClick={() => {
                        purgeMail(view.msg.id);
                        setView({ mode: "list" });
                        toast("Депеша уничтожена безвозвратно", "err");
                      }}
                    >
                      <IcX size={13} /> Уничтожить
                    </button>
                  </>
                )}
              </div>
              <div className="mt-4 border-b border-[var(--line)] pb-4">
                <h2 className="display text-lg font-extrabold leading-snug">{view.msg.subject}</h2>
                <div className="mono mt-2 space-y-1 text-[11px] text-[var(--txt2)]">
                  <div>ОТ: <span className="text-[var(--gold2)]">{who(view.msg.from)}</span></div>
                  <div>КОМУ: <span className="text-[var(--gold2)]">{who(view.msg.to)}</span></div>
                  <div className="text-[var(--dim)]">{fmtDT(view.msg.ts)} • ДОСТАВЛЕНО ЧЕРЕЗ КЭП (POST.ARG) • КОПИЯ В АРХИВЕ ГНИЦСТ</div>
                </div>
              </div>
              <p className="whitespace-pre-line pt-4 text-[13.5px] leading-7 text-[var(--txt)]">{view.msg.body}</p>
            </div>
          )}

          {view.mode === "compose" && (
            <form onSubmit={doSend} className="siteIn flex h-full flex-col p-5">
              <h2 className="display text-lg font-extrabold">
                {view.replyTo ? `ОТВЕТ: ${view.replyTo.from.toUpperCase()}` : "НОВАЯ ДЕПЕША"}
              </h2>
              <div className="mt-4 space-y-3.5">
                <div>
                  <label className="mono mb-1.5 block text-[10px] tracking-[0.2em] text-[var(--dim)]">ПОЛУЧАТЕЛЬ (IŦIRINIO)</label>
                  <select className="field" value={to} onChange={(e) => setTo(e.target.value)}>
                    <option value="">— выберите подданного —</option>
                    {users.map((u) => (
                      <option key={u.login} value={u.login}>
                        {u.name} • {u.itirinio}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mono mb-1.5 block text-[10px] tracking-[0.2em] text-[var(--dim)]">ТЕМА</label>
                  <input className="field" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Тема депеши" />
                </div>
                <div className="flex-1">
                  <label className="mono mb-1.5 block text-[10px] tracking-[0.2em] text-[var(--dim)]">СОДЕРЖАНИЕ</label>
                  <textarea
                    className="field h-44 resize-none leading-6 lg:h-56"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Текст депеши…"
                  />
                </div>
              </div>
              {err && <p className="mono mt-3 border border-[var(--red2)] bg-[rgba(139,0,0,.12)] px-3 py-2 text-[11.5px] text-[var(--red3)]">{err}</p>}
              <div className="mt-4 flex gap-2">
                <button type="button" className="btn" onClick={() => setView({ mode: "list" })}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-gold">
                  <IcSend size={14} /> Отправить через КЭП
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
