import { useState } from "react";
import {
  useDB,
  balanceOf,
  transfer,
  txsFor,
  fmtDT,
  userName,
  roleLabel,
  toast,
  type User,
} from "../../lib/db";
import { Emblem, IcDoc, IcKey, IcSend, SiteMark } from "../../lib/icons";

/* ================= StatusBanko (sb.arg) ================= */

export function BankSite({ user }: { user: User }) {
  const db = useDB();
  const balance = balanceOf(user.login);
  const txs = txsFor(user.login);
  const recipients = db.users.filter((u) => u.login !== user.login && !u.blocked);
  const [to, setTo] = useState(recipients[0]?.login ?? "");
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const a = Number(amount.replace(",", "."));
    const err = transfer(user.login, to, a, purpose);
    if (err) toast(err, "err");
    else {
      toast(`Платёж на ${a.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} e-T проведён`);
      setAmount("");
      setPurpose("");
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <div className="fadeUp flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mono text-[10px] tracking-[0.3em] text-[var(--dim)]">ГОСУДАРСТВЕННЫЙ БАНК • SB.ARG : 8001</p>
          <h1 className="display mt-2 text-3xl font-extrabold tracking-wide sm:text-4xl">
            STATUS<span className="text-[var(--gold)]">BANKO</span>
          </h1>
        </div>
        <div className="mono text-[10.5px] text-[var(--txt2)]">
          <div>СЧЁТ: <span className="text-[var(--gold2)]">{user.login.toUpperCase()}</span></div>
          <div>ДЕРЖАТЕЛЬ: <span className="text-[var(--gold2)]">{user.name}</span></div>
        </div>
      </div>
      <div className="goldline mt-5" />

      <div className="mt-6 grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="flex flex-col gap-4">
          <div className="panel fadeUp border-t-2 border-t-[var(--gold)] p-5">
            <p className="mono text-[10px] tracking-[0.25em] text-[var(--dim)]">ОСТАТОК НА СЧЁТЕ</p>
            <p className="display mt-2 text-4xl font-extrabold text-[var(--gold2)]">
              {balance.toLocaleString("ru-RU", { minimumFractionDigits: 2 })}
              <span className="ml-2 text-lg text-[var(--txt2)]">e-T</span>
            </p>
            <p className="mono mt-2 text-[10px] text-[var(--dim)]">ИМПЕРСКИЙ ТАЛЕР • ЕДИНИЦА РАСЧЁТА ЕГИКС</p>
          </div>

          <form onSubmit={submit} className="panel fadeUp p-5" style={{ animationDelay: "80ms" }}>
            <h3 className="display flex items-center gap-2 text-sm font-bold tracking-wider">
              <IcSend size={15} className="text-[var(--gold)]" /> ПЕРЕВОД e-T
            </h3>
            <div className="goldline my-3" />
            <label className="mono text-[10px] tracking-[0.2em] text-[var(--dim)]">ПОЛУЧАТЕЛЬ</label>
            <select value={to} onChange={(e) => setTo(e.target.value)} className="field mt-1">
              {recipients.map((r) => (
                <option key={r.login} value={r.login}>
                  {r.name} ({r.login})
                </option>
              ))}
            </select>
            <label className="mono mt-3 block text-[10px] tracking-[0.2em] text-[var(--dim)]">СУММА, e-T</label>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} className="field mono mt-1" placeholder="0,00" inputMode="decimal" />
            <label className="mono mt-3 block text-[10px] tracking-[0.2em] text-[var(--dim)]">НАЗНАЧЕНИЕ ПЛАТЕЖА (ОБЯЗАТЕЛЬНО)</label>
            <input value={purpose} onChange={(e) => setPurpose(e.target.value)} className="field mt-1" placeholder="Пошлина за домен" required />
            <button className="btn btn-gold mt-4 w-full">Провести платёж</button>
          </form>
        </div>

        <div className="panel fadeUp overflow-x-auto" style={{ animationDelay: "140ms" }}>
          <div className="flex items-center justify-between px-4 pt-4">
            <h3 className="display text-sm font-bold tracking-wider">ЖУРНАЛ ОПЕРАЦИЙ</h3>
            <span className="mono text-[10px] text-[var(--dim)]">ПОДЛЕЖИТ АНАЛИЗУ ГНИЦСТ (КГТ)</span>
          </div>
          <table className="tbl mt-2">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Контрагент</th>
                <th>Назначение</th>
                <th className="text-right">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {txs.length === 0 && (
                <tr>
                  <td colSpan={4} className="mono py-6 text-center text-[12px] text-[var(--dim)]">
                    Операций по счёту не значится.
                  </td>
                </tr>
              )}
              {txs.map((t) => {
                const out = t.from === user.login;
                return (
                  <tr key={t.id}>
                    <td className="mono text-[11px] text-[var(--txt2)]">{fmtDT(t.ts)}</td>
                    <td className="text-[12.5px]">{userName(out ? t.to : t.from)}</td>
                    <td className="max-w-[260px] truncate text-[12px] text-[var(--txt2)]">{t.purpose}</td>
                    <td className={`mono text-right font-semibold ${out ? "text-[var(--red3)]" : "text-[var(--gold2)]"}`}>
                      {out ? "−" : "+"}
                      {t.amount.toLocaleString("ru-RU", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ================= login.arg (служебный узел SSO) ================= */

export function ServiceSite({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12 text-center">
      <Emblem size={72} className="mx-auto" />
      <p className="mono mt-4 text-[10px] tracking-[0.3em] text-[var(--dim)]">СЛУЖЕБНЫЙ УЗЕЛ • LOGIN.ARG : 8000</p>
      <h1 className="display mt-2 text-3xl font-extrabold">ЕДИНЫЙ ПОРТАЛ АУТЕНТИФИКАЦИИ</h1>
      <p className="mt-4 text-sm leading-relaxed text-[var(--txt2)]">
        Аутентификация уже пройдена — повторный вход не требуется. Узел login.arg осуществляет проверку
        IŦirinio по Государственному реестру паспортов и выдаёт мандат доступа к службам ЕГИКС.
      </p>

      <div className="panel mx-auto mt-6 max-w-md p-5 text-left">
        <h3 className="display text-sm font-bold tracking-wider">ТЕКУЩИЙ МАНДАТ</h3>
        <div className="goldline my-3" />
        <div className="mono space-y-2 text-[12px] text-[var(--txt2)]">
          <p>ДЕРЖАТЕЛЬ: <span className="text-[var(--gold2)]">{user.name}</span></p>
          <p>IŦIRINIO: <span className="break-all text-[var(--gold2)]">{user.itirinio}</span></p>
          <p>СТАТУС: <span className="text-[var(--gold2)]">{roleLabel(user.role)}</span></p>
          <p>ГИКС: <span className="text-[var(--gold2)]">{user.giks}</span></p>
        </div>
      </div>

      <div className="mt-6 flex justify-center gap-3">
        <button className="btn btn-danger" onClick={onLogout}>
          <IcKey size={14} /> Разорвать сеанс
        </button>
      </div>

      <p className="mono mt-8 flex items-center justify-center gap-2 text-[9.5px] tracking-[0.18em] text-[var(--dim)]">
        <IcDoc size={13} /> НЕСАНКЦИОНИРОВАННЫЙ ДОСТУП ПРЕСЛЕДУЕТСЯ ПО СТ. 14 (79) ЗАКОНА TOQORRO
      </p>
    </div>
  );
}
