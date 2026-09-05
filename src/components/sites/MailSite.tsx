import { useState } from "react";
import {
  useDB,
  mailFor,
  markRead,
  setTrashed,
  purgeMail,
  sendMail,
  unreadCount,
  userName,
  fmtDT,
  toast,
  type User,
  type EmailMsg,
} from "../../lib/db";
import { IcInbox, IcMail, IcOutbox, IcReply, IcSend, IcTrash, IcX } from "../../lib/icons";

type Folder = "in" | "out" | "trash";

const FOLDERS: Array<{ id: Folder; label: string; icon: React.ReactNode }> = [
  { id: "in", label: "Входящие", icon: <IcInbox size={16} /> },
  { id: "out", label: "Отправленные", icon: <IcOutbox size={16} /> },
  { id: "trash", label: "Корзина", icon: <IcTrash size={16} /> },
];

export default function MailSite({ user }: { user: User }) {
  const db = useDB();
  const [folder, setFolder] = useState<Folder>("in");
  const [sel, setSel] = useState<EmailMsg | null>(null);
  const [compose, setCompose] = useState(false);
  const [to, setTo] = useState("");
  const [fixedTo, setFixedTo] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const list = mailFor(user.login, folder);
  const unread = unreadCount(user.login);
  const recipients = db.users.filter((u) => u.login !== user.login);

  const open = (m: EmailMsg) => {
    setSel(m);
    if (!m.read && m.folder === "in") markRead(m.id);
  };

  const switchFolder = (f: Folder) => {
    setFolder(f);
    setSel(null);
  };

  const openCompose = (presetTo?: string) => {
    setTo(presetTo ?? "");
    setFixedTo(Boolean(presetTo));
    setSubject("");
    setBody("");
    setCompose(true);
  };

  const submit = () => {
    if (!to) {
      toast("Укажите адресата депеши", "err");
      return;
    }
    sendMail(user.login, to, subject, body);
    setCompose(false);
    toast(`Депеша доставлена: ${to}@anct`);
  };

  const toTrash = () => {
    if (!sel) return;
    setTrashed(sel.id, true);
    setSel(null);
    toast("Депеша переложена в корзину", "info");
  };

  const restore = () => {
    if (!sel) return;
    setTrashed(sel.id, false);
    setSel(null);
    toast("Депеша восстановлена");
  };

  const destroy = () => {
    if (!sel) return;
    purgeMail(sel.id);
    setSel(null);
    toast("Депеша уничтожена безвозвратно", "err");
  };

  return (
    <div className="flex h-full min-h-0">
      {/* левая колонка */}
      <div className="flex w-48 shrink-0 flex-col border-r border-[var(--line)] p-3">
        <button onClick={() => openCompose()} className="btn btn-brass w-full">
          <IcSend size={15} /> Новая депеша
        </button>
        <div className="mt-4">
          {FOLDERS.map((f) => {
            const count = f.id === "in" ? unread : mailFor(user.login, f.id).length;
            const active = folder === f.id;
            return (
              <button
                key={f.id}
                onClick={() => switchFolder(f.id)}
                className={`flex w-full items-center gap-2.5 border-l-2 px-3 py-2 text-left text-[13px] transition-all ${
                  active
                    ? "border-[var(--brass)] bg-[rgba(201,163,92,.08)] text-[var(--brass2)]"
                    : "border-transparent text-[var(--txt2)] hover:bg-[rgba(233,226,208,.04)] hover:text-[var(--txt)]"
                }`}
              >
                {f.icon}
                <span className="flex-1">{f.label}</span>
                {count > 0 && (
                  <span className={`mono text-[10px] ${f.id === "in" ? "text-[var(--brass2)]" : "text-[var(--dim)]"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="mono mt-auto border-t border-[var(--line)] pt-3 text-[10px] leading-5 text-[var(--dim)]">
          ЯЩИК: {user.login}@anct
          <br />
          СЛУЖБА: ИМПЕРСКАЯ ПОЧТА
        </div>
      </div>

      {/* список */}
      <div className="w-72 shrink-0 overflow-y-auto border-r border-[var(--line)]">
        {list.length === 0 && (
          <p className="mono p-4 text-[11px] leading-6 text-[var(--dim)]">
            {folder === "in" && "Входящих депеш нет.\nТишина на линии — тоже весть."}
            {folder === "out" && "Отправленных депеш пока нет."}
            {folder === "trash" && "Корзина пуста. Порядок — залог Империи."}
          </p>
        )}
        {list.map((m) => {
          const counterpart = m.folder === "in" ? m.from : m.to;
          const isSel = sel?.id === m.id;
          return (
            <button
              key={m.id}
              onClick={() => open(m)}
              className={`block w-full border-b border-l-2 border-b-[var(--line)] px-3 py-2.5 text-left transition-all ${
                isSel
                  ? "border-l-[var(--brass)] bg-[rgba(201,163,92,.07)]"
                  : "border-l-transparent hover:bg-[rgba(233,226,208,.035)]"
              }`}
            >
              <div className="flex items-center gap-2">
                {!m.read && m.folder === "in" && (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brass)]" />
                )}
                <span
                  className={`flex-1 truncate text-[13px] ${
                    !m.read && m.folder === "in" ? "font-bold text-[var(--txt)]" : "font-medium text-[var(--txt2)]"
                  }`}
                >
                  {m.subject}
                </span>
                <span className="mono shrink-0 text-[10px] text-[var(--dim)]">{fmtDT(m.ts)}</span>
              </div>
              <div className="mt-0.5 truncate text-xs text-[var(--txt2)]">
                {m.folder === "in" ? "от " : "к "}
                {userName(counterpart)}
              </div>
              <div className="mt-0.5 line-clamp-1 text-[11px] text-[var(--dim)]">{m.body}</div>
            </button>
          );
        })}
      </div>

      {/* чтение */}
      <div className="relative min-w-0 flex-1 overflow-y-auto p-6">
        {!sel && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-[var(--dim)]">
            <IcMail size={44} sw={1} />
            <p className="mono text-[11px] tracking-[0.2em]">ВЫБЕРИТЕ ДЕПЕШУ ДЛЯ ЧТЕНИЯ</p>
          </div>
        )}
        {sel && (
          <div className="siteIn max-w-2xl">
            <div className="flex items-start justify-between gap-6">
              <div>
                <h2 className="display text-xl leading-snug text-[var(--txt)]">{sel.subject}</h2>
                <div className="mono mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--txt2)]">
                  <span>
                    ОТ: <b className="text-[var(--brass2)]">{userName(sel.from)}</b> ({sel.from}@anct)
                  </span>
                  <span>→</span>
                  <span>
                    КОМУ: <b className="text-[var(--verd2)]">{userName(sel.to)}</b> ({sel.to}@anct)
                  </span>
                </div>
                <div className="mono mt-1 text-[10px] text-[var(--dim)]">{fmtDT(sel.ts)} • доставка мгновенная</div>
              </div>
              <div
                className="stampIn mono hidden shrink-0 border-2 px-3 py-2 text-[10px] tracking-[0.25em] sm:block"
                style={{ borderColor: "rgba(198,90,69,.5)", color: "var(--signal2)" }}
              >
                АРГСКАЯ ПОЧТА
                <br />
                {sel.folder === "in" ? "ДОСТАВЛЕНО" : "ОТПРАВЛЕНО"}
              </div>
            </div>

            <div className="mt-5 border-t border-[var(--line)] pt-5 text-sm leading-7 text-[var(--txt2)]">
              {sel.body.split("\n").map((line, i) => (
                <p key={i} className={line ? "" : "h-4"}>
                  {line}
                </p>
              ))}
            </div>

            <div className="mt-7 flex flex-wrap gap-2">
              {folder === "in" && (
                <button className="btn" onClick={() => openCompose(sel.from)}>
                  <IcReply size={15} /> Ответить
                </button>
              )}
              {folder !== "trash" ? (
                <button className="btn btn-danger" onClick={toTrash}>
                  <IcTrash size={15} /> В корзину
                </button>
              ) : (
                <>
                  <button className="btn" onClick={restore}>
                    <IcReply size={15} /> Восстановить
                  </button>
                  <button className="btn btn-danger" onClick={destroy}>
                    <IcX size={15} /> Уничтожить
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* сочинение */}
      {compose && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(8,13,11,.78)] p-4" onClick={() => setCompose(false)}>
          <div className="panel siteIn w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="display text-lg tracking-wide">НОВАЯ ДЕПЕША</h3>
              <button onClick={() => setCompose(false)} className="p-1 text-[var(--dim)] transition-colors hover:text-[var(--signal2)]">
                <IcX size={18} />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mono mb-1 block text-[10px] tracking-[0.25em] text-[var(--dim)]">КОМУ</label>
                <select className="field mono" value={to} disabled={fixedTo} onChange={(e) => setTo(e.target.value)}>
                  <option value="">— выберите адресата —</option>
                  {recipients.map((u) => (
                    <option key={u.login} value={u.login}>
                      {u.name} — {u.login}@anct
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mono mb-1 block text-[10px] tracking-[0.25em] text-[var(--dim)]">ТЕМА</label>
                <input className="field" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="О чём депеша" />
              </div>
              <div>
                <label className="mono mb-1 block text-[10px] tracking-[0.25em] text-[var(--dim)]">ТЕКСТ</label>
                <textarea
                  className="field min-h-36 resize-y leading-6"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Ваше Императорское Величество!.."
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button className="btn" onClick={() => setCompose(false)}>
                  Отмена
                </button>
                <button className="btn btn-brass" onClick={submit}>
                  <IcSend size={15} /> Отправить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
