import { useMemo, useState } from "react";
import { useDB, fmtDT, roleLabel, toast, type User } from "../../lib/db";
import {
  useBank,
  accountsForUser,
  accountById,
  accountByNumber,
  availableBalance,
  changeCurrency,
  closeAccount,
  createGovernmentAccount,
  credit,
  currency,
  decideAccount,
  displayCurrencyOf,
  fmtMoney,
  getRate,
  isBankOfficer,
  openAccount,
  ownerName,
  payTax,
  pendingAccounts,
  pendingCountOf,
  primaryCurrency,
  profileOf,
  saveProfile,
  setDisplayCurrency,
  setFrozen,
  transfer,
  txsForAccount,
  txTypeName,
  ACCOUNT_STATUS_LABEL,
  ACCOUNT_TYPE_LABEL,
  GOV_TYPES,
  type AccountType,
  type BankAccount,
  type BankTx,
} from "../../lib/bank";
import { IcArrowL, IcCheck, IcClock, IcDoc, IcGlobe, IcPlus, IcSend, IcUsers, IcX } from "../../lib/icons";

type Page =
  | "dash"
  | "transfer"
  | "txs"
  | "rates"
  | "open"
  | "pending"
  | "profile"
  | "approve"
  | "gov"
  | "credit";

const fmtNum = (n: string) => n.replace(/(.{4})/g, "$1 ").trim();
const statusChip = (s: BankAccount["status"]) =>
  s === "ACTIVE" ? "chip chip-gold" : s === "FROZEN" ? "chip chip-red" : "chip";

export default function BankSite({ user }: { user: User }) {
  useBank();
  const officer = isBankOfficer(user.login, user.role);
  const [page, setPage] = useState<Page>("dash");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [toastKey, setToastKey] = useState(0);
  const refresh = () => setToastKey((k) => k + 1);

  const NAV: Array<{ id: Page; label: string; admin?: boolean }> = [
    { id: "dash", label: "Кабинет" },
    { id: "transfer", label: "Перевод" },
    { id: "txs", label: "Операции" },
    { id: "rates", label: "Курсы" },
    { id: "open", label: "Новый счёт" },
    { id: "pending", label: "Заявки" },
    { id: "profile", label: "Профиль" },
    { id: "approve", label: "Утверждение", admin: true },
    { id: "gov", label: "Госсчета", admin: true },
    { id: "credit", label: "Касса", admin: true },
  ];

  const detail = detailId ? accountById(detailId) : undefined;

  return (
    <div className="mx-auto max-w-6xl px-5 py-8" key={toastKey}>
      {/* шапка */}
      <div className="fadeUp flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mono text-[10px] tracking-[0.3em] text-[var(--dim)]">
            ARGIAN NAZIONAL BANK • SB.ARG : 8001 • ВЫПУСК V1.6
          </p>
          <h1 className="display mt-2 text-3xl font-extrabold tracking-wide sm:text-4xl">
            STATUS<span className="text-[var(--gold)]">BANKO</span>
          </h1>
        </div>
        <div className="mono text-[10.5px] leading-5 text-[var(--txt2)]">
          <div>КЛИЕНТ: <span className="text-[var(--gold2)]">{user.name}</span></div>
          <div>IŦIRINIO: <span className="text-[var(--gold2)]">{user.itirinio}</span></div>
          <div>СОСЛОВИЕ: <span className="text-[var(--gold2)]">{roleLabel(user.role)}</span></div>
        </div>
      </div>
      <div className="goldline mt-5" />

      {/* навигация */}
      <div className="mt-5 flex flex-wrap gap-2">
        {NAV.filter((n) => !n.admin || officer).map((n) => (
          <button
            key={n.id}
            onClick={() => {
              setPage(n.id);
              setDetailId(null);
            }}
            className={`btn px-3.5 py-2 text-[11px] ${
              page === n.id && !detail ? "border-[var(--gold)] bg-[rgba(212,175,55,.08)] text-[var(--gold2)]" : ""
            }`}
          >
            {n.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {detail ? (
          <DetailPage acc={detail} user={user} onBack={() => setDetailId(null)} />
        ) : page === "dash" ? (
          <DashPage user={user} onOpen={(id) => setDetailId(id)} />
        ) : page === "transfer" ? (
          <TransferPage user={user} onChanged={refresh} />
        ) : page === "txs" ? (
          <TxsPage user={user} />
        ) : page === "rates" ? (
          <RatesPage />
        ) : page === "open" ? (
          <OpenPage user={user} onChanged={refresh} />
        ) : page === "pending" ? (
          <PendingPage user={user} />
        ) : page === "profile" ? (
          <ProfilePage user={user} />
        ) : page === "approve" && officer ? (
          <ApprovePage onChanged={refresh} />
        ) : page === "gov" && officer ? (
          <GovPage onChanged={refresh} />
        ) : page === "credit" && officer ? (
          <CreditPage onChanged={refresh} />
        ) : null}
      </div>

      <p className="mono mt-10 border-t border-[var(--line)] pt-4 text-[9.5px] leading-4 tracking-[0.16em] text-[var(--dim)]">
        STATUSBANKO — ГОСУДАРСТВЕННЫЙ БАНК ИМПЕРИИ АРГИЯ. ВСЕ ОПЕРАЦИИ АРХИВИРУЮТСЯ И АНАЛИЗИРУЮТСЯ ГНИЦСТ
        СОГЛАСНО СТ. 1 (187) КГТ. КУРСЫ УСТАНАВЛИВАЕТ БАНК; ОСНОВНАЯ ВАЛЮТА — {primaryCurrency()?.code ?? "ARY"}.
      </p>
    </div>
  );
}

/* ================= кабинет (dashboard) ================= */

function DashPage({ user, onOpen }: { user: User; onOpen: (id: string) => void }) {
  const bank = useBank();
  const my = accountsForUser(user.login);
  const disp = displayCurrencyOf(user.login);

  const total = useMemo(() => {
    let sum = 0;
    for (const a of my) {
      if (a.status === "PENDING") continue;
      sum += a.currency === disp.code ? a.balance : (a.balance * (getRate(a.currency, disp.code) ?? 0));
    }
    return sum;
  }, [my, disp.code]);

  const active = my.filter((a) => a.status === "ACTIVE").length;
  const pending = my.filter((a) => a.status === "PENDING").length;
  const myIds = new Set(my.map((a) => a.id));
  const recent = bank.txs.filter((t) => myIds.has(t.from ?? "") || myIds.has(t.to)).slice(0, 2);

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
      <div className="flex flex-col gap-4">
        <div className="panel fadeUp border-t-2 border-t-[var(--gold)] p-5">
          <p className="mono text-[10px] tracking-[0.25em] text-[var(--dim)]">ОБЩИЙ БАЛАНС</p>
          <p className="display mt-2 text-4xl font-extrabold text-[var(--gold2)]">
            {total.toLocaleString("ru-RU", { maximumFractionDigits: 2 })}
            <span className="ml-2 text-lg text-[var(--txt2)]">{disp.symbol}</span>
          </p>
          <p className="mono mt-1 text-[10px] text-[var(--dim)]">В ВАЛЮТЕ ОТОБРАЖЕНИЯ • {disp.name.toUpperCase()}</p>
          <label className="mono mt-4 block text-[10px] tracking-[0.2em] text-[var(--dim)]">ВАЛЮТА ОТОБРАЖЕНИЯ</label>
          <select
            value={disp.code}
            onChange={(e) => {
              setDisplayCurrency(user.login, e.target.value);
              toast(`Валюта отображения: ${e.target.value}`, "info");
            }}
            className="field mt-1"
          >
            {bank.currencies.filter((c) => c.active).map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="panel fadeUp grid grid-cols-2 gap-3 p-5" style={{ animationDelay: "70ms" }}>
          <div>
            <p className="display text-3xl font-extrabold text-[var(--txt)]">{active}</p>
            <p className="mono mt-1 text-[9.5px] tracking-[0.18em] text-[var(--dim)]">АКТИВНЫХ СЧЕТОВ</p>
          </div>
          <div>
            <p className="display text-3xl font-extrabold text-[var(--txt)]">{pending}</p>
            <p className="mono mt-1 text-[9.5px] tracking-[0.18em] text-[var(--dim)]">НА РАССМОТРЕНИИ</p>
          </div>
        </div>

        <div className="panel fadeUp p-5" style={{ animationDelay: "120ms" }}>
          <p className="mono text-[10px] tracking-[0.25em] text-[var(--dim)]">ПОСЛЕДНИЕ ОПЕРАЦИИ</p>
          <div className="mt-2">
            {recent.length === 0 && <p className="mono text-[11px] text-[var(--dim)]">Операций пока не значится.</p>}
            {recent.map((t) => (
              <TxLine key={t.id} tx={t} viewer={user.login} />
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="display text-lg font-bold tracking-wider">МОИ СЧЕТА</h2>
          <span className="mono text-[10px] tracking-[0.2em] text-[var(--dim)]">НОМЕР — 16 ЗНАКОВ</span>
        </div>
        {my.length === 0 && (
          <div className="panel p-8 text-center">
            <p className="text-sm text-[var(--txt2)]">У вас нет счетов в StatusBanko.</p>
            <p className="mono mt-1 text-[10px] tracking-[0.2em] text-[var(--dim)]">ПОДАЙТЕ ЗАЯВЛЕНИЕ — ВКЛАДКА «НОВЫЙ СЧЁТ»</p>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {my.map((a, i) => (
            <button
              key={a.id}
              onClick={() => onOpen(a.id)}
              className="fadeUp panel group p-4 text-left transition-all hover:-translate-y-0.5 hover:border-[var(--gold)]"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="mono text-[11px] tracking-[0.12em] text-[var(--txt2)]">{fmtNum(a.number)}</span>
                <span className={statusChip(a.status)}>{ACCOUNT_STATUS_LABEL[a.status]}</span>
              </div>
              <p className="mt-2 text-[12.5px] font-semibold text-[var(--txt)] transition-colors group-hover:text-[var(--gold2)]">
                {ACCOUNT_TYPE_LABEL[a.type]}
              </p>
              <p className="display mt-2 text-2xl font-extrabold text-[var(--gold2)]">{fmtMoney(a.balance, a.currency)}</p>
              {a.type === "CREDIT" && (
                <p className="mono mt-1 text-[10px] text-[var(--dim)]">
                  ДОСТУПНО: {fmtMoney(availableBalance(a), a.currency)} (лимит {fmtMoney(a.creditLimit, a.currency)})
                </p>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TxLine({ tx, viewer }: { tx: BankTx; viewer: string }) {
  const fromAcc = tx.from ? accountById(tx.from) : undefined;
  const toAcc = accountById(tx.to);
  const out = fromAcc?.user === viewer;
  const inc = toAcc?.user === viewer;
  const sign = out && !inc ? "−" : inc ? "+" : "±";
  const cur = inc ? toAcc?.currency : fromAcc?.currency;
  const amt = inc ? tx.amount : tx.originalAmount;
  const color = sign === "+" ? "text-[var(--gold2)]" : sign === "−" ? "text-[var(--red3)]" : "text-[var(--txt2)]";
  const counterparty = out ? (toAcc ? ownerName(toAcc) : "внешний счёт") : fromAcc ? ownerName(fromAcc) : "Банк";
  return (
    <div className="flex items-center gap-3 border-b border-[var(--line)] py-2.5 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] text-[var(--txt)]">{txTypeName(tx.type)} • {counterparty}</p>
        <p className="mono truncate text-[10px] text-[var(--dim)]">{fmtDT(tx.ts)} • {tx.desc}</p>
      </div>
      <span className={`mono shrink-0 text-[13px] font-semibold ${color}`}>
        {sign} {cur ? fmtMoney(Math.abs(amt), cur) : "—"}
      </span>
    </div>
  );
}

/* ================= перевод ================= */

function TransferPage({ user, onChanged }: { user: User; onChanged: () => void }) {
  const bank = useBank();
  const my = accountsForUser(user.login).filter((a) => a.status === "ACTIVE");
  const [fromId, setFromId] = useState(my[0]?.id ?? "");
  const [toNum, setToNum] = useState("");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [receipt, setReceipt] = useState<string | null>(null);

  const from = accountById(fromId);
  const prim = primaryCurrency();
  const toAcc = toNum.replace(/\s/g, "").length === 16 ? accountByNumber(toNum) : undefined;
  const amt = Number(amount.replace(",", "."));

  const preview = useMemo(() => {
    if (!from || !toAcc || !(amt > 0) || from.currency === toAcc.currency) return null;
    const r = getRate(from.currency, toAcc.currency);
    return r === null ? null : { r, got: amt * r };
  }, [from, toAcc, amt]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setReceipt(null);
    const res = transfer({ fromId, toNumber: toNum, amount: amt, desc });
    if (res.err) {
      toast(res.err, "err");
      return;
    }
    const msg =
      from && toAcc && from.currency !== toAcc.currency
        ? `Перевод выполнен: ${fmtMoney(amt, from.currency)} → ${fmtMoney(res.tx?.amount ?? 0, toAcc.currency)} (курс ${res.tx?.rate?.toLocaleString("ru-RU", { maximumFractionDigits: 6 })})`
        : `Перевод на сумму ${fmtMoney(amt, from?.currency ?? "")} выполнен успешно`;
    setReceipt(msg);
    toast("Перевод проведён", "ok");
    setAmount("");
    setDesc("");
    onChanged();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <form onSubmit={submit} className="panel fadeUp p-5">
        <h3 className="display flex items-center gap-2 text-sm font-bold tracking-wider">
          <IcSend size={15} className="text-[var(--gold)]" /> ПЕРЕВОД МЕЖДУ СЧЕТАМИ
        </h3>
        <div className="goldline my-3" />
        <label className="mono text-[10px] tracking-[0.2em] text-[var(--dim)]">СЧЁТ СПИСАНИЯ</label>
        <select value={fromId} onChange={(e) => setFromId(e.target.value)} className="field mt-1">
          {my.map((a) => (
            <option key={a.id} value={a.id}>
              {fmtNum(a.number)} • {ACCOUNT_TYPE_LABEL[a.type]} • {fmtMoney(a.balance, a.currency)}
            </option>
          ))}
        </select>

        <label className="mono mt-4 block text-[10px] tracking-[0.2em] text-[var(--dim)]">СЧЁТ ПОЛУЧАТЕЛЯ (16 ЗНАКОВ)</label>
        <input
          value={fmtNum(toNum.replace(/\s/g, "").toUpperCase().slice(0, 16))}
          onChange={(e) => setToNum(e.target.value.replace(/\s/g, "").toUpperCase().slice(0, 16))}
          className="field mono mt-1"
          placeholder="0000 0000 0000 0000"
        />
        <p className="mono mt-1 h-4 text-[10.5px]">
          {toNum.length === 16 &&
            (toAcc ? (
              <span className="text-[var(--gold2)]">Получатель: {ownerName(toAcc)} • {ACCOUNT_TYPE_LABEL[toAcc.type]}</span>
            ) : (
              <span className="text-[var(--red3)]">Счёт с таким номером не найден</span>
            ))}
        </p>

        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mono text-[10px] tracking-[0.2em] text-[var(--dim)]">
              СУММА{from ? `, ${from.currency}` : ""}
            </label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="field mono mt-1"
              placeholder="0,00"
              inputMode="decimal"
            />
          </div>
          <div>
            <label className="mono text-[10px] tracking-[0.2em] text-[var(--dim)]">НАЗНАЧЕНИЕ ПЛАТЕЖА</label>
            <input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="field mt-1"
              placeholder={`Перевод между счетами через ${prim?.code ?? "ARY"}`}
            />
          </div>
        </div>

        {preview && toAcc && from && (
          <p className="mono mt-3 border border-dashed border-[var(--gold)] bg-[rgba(212,175,55,.05)] p-2.5 text-[11px] text-[var(--gold2)]">
            ПОЛУЧАТЕЛЬ ЗАЧИСЛИТ ≈ {fmtMoney(preview.got, toAcc.currency)} (1 {from.currency} ={" "}
            {preview.r.toLocaleString("ru-RU", { maximumFractionDigits: 6 })} {toAcc.currency})
          </p>
        )}
        {receipt && (
          <p className="mono mt-3 border border-[var(--gold)] bg-[rgba(212,175,55,.08)] p-2.5 text-[11px] text-[var(--gold2)]">
            ✓ {receipt}
          </p>
        )}

        <button className="btn btn-gold mt-4 w-full py-3" disabled={!from || !toAcc || !(amt > 0)}>
          Провести перевод
        </button>
      </form>

      <div className="panel fadeUp h-fit p-5" style={{ animationDelay: "80ms" }}>
        <h3 className="display flex items-center gap-2 text-sm font-bold tracking-wider">
          <IcGlobe size={15} className="text-[var(--gold)]" /> КУРСЫ К {prim?.code ?? "ARY"}
        </h3>
        <div className="goldline my-3" />
        <table className="tbl">
          <thead>
            <tr>
              <th>Направление</th>
              <th className="text-right">Курс</th>
            </tr>
          </thead>
          <tbody>
            {bank.currencies
              .filter((c) => c.active && c.code !== prim?.code)
              .map((c) => {
                const to = getRate(c.code, prim?.code ?? "");
                const from = getRate(prim?.code ?? "", c.code);
                return (
                  <tr key={c.code}>
                    <td className="mono text-[11.5px]">{c.code} → {prim?.code}</td>
                    <td className="mono text-right text-[12px] text-[var(--gold2)]">
                      {to?.toLocaleString("ru-RU", { maximumFractionDigits: 6 }) ?? "нет"}
                    </td>
                  </tr>
                );
              })}
            {bank.currencies
              .filter((c) => c.active && c.code !== prim?.code)
              .map((c) => {
                const from = getRate(prim?.code ?? "", c.code);
                return (
                  <tr key={c.code + "-r"}>
                    <td className="mono text-[11.5px]">{prim?.code} → {c.code}</td>
                    <td className="mono text-right text-[12px] text-[var(--gold2)]">
                      {from?.toLocaleString("ru-RU", { maximumFractionDigits: 6 }) ?? "нет"}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
        <p className="mono mt-3 text-[9.5px] leading-4 text-[var(--dim)]">
          КОНВЕРТАЦИЯ ВЫПОЛНЯЕТСЯ ЧЕРЕЗ ОСНОВНУЮ ВАЛЮТУ {prim?.code ?? "ARY"}. КУРСЫ УСТАНАВЛИВАЕТ БАНК.
        </p>
      </div>
    </div>
  );
}

/* ================= операции ================= */

function TxsPage({ user }: { user: User }) {
  const bank = useBank();
  const myIds = new Set(accountsForUser(user.login).map((a) => a.id));
  const txs = bank.txs.filter((t) => myIds.has(t.from ?? "") || myIds.has(t.to));
  return (
    <div className="panel fadeUp overflow-x-auto">
      <div className="flex items-center justify-between px-4 pt-4">
        <h3 className="display text-sm font-bold tracking-wider">ЖУРНАЛ ОПЕРАЦИЙ</h3>
        <span className="mono text-[10px] text-[var(--dim)]">ПОДЛЕЖИТ АНАЛИЗУ ГНИЦСТ (КГТ)</span>
      </div>
      <div className="mt-2 px-4 pb-4">
        {txs.length === 0 && <p className="mono py-6 text-center text-[12px] text-[var(--dim)]">Операций по вашим счетам не значится.</p>}
        {txs.map((t) => (
          <TxLine key={t.id} tx={t} viewer={user.login} />
        ))}
      </div>
    </div>
  );
}

/* ================= курсы ================= */

function RatesPage() {
  const bank = useBank();
  const prim = primaryCurrency();
  return (
    <div className="panel fadeUp overflow-x-auto">
      <div className="px-4 pt-4">
        <h3 className="display text-sm font-bold tracking-wider">ОФИЦИАЛЬНЫЕ КУРСЫ БАНКА</h3>
        <p className="mono mt-1 text-[10px] tracking-[0.2em] text-[var(--dim)]">
          ОСНОВНАЯ ВАЛЮТА: {prim?.code} — {prim?.name.toUpperCase()}
        </p>
      </div>
      <table className="tbl mt-3">
        <thead>
          <tr>
            <th>Валюта</th>
            <th>Код</th>
            <th>Символ</th>
            <th className="text-right">К {prim?.code}</th>
            <th className="text-right">От {prim?.code}</th>
          </tr>
        </thead>
        <tbody>
          {bank.currencies
            .filter((c) => c.active)
            .map((c) => (
              <tr key={c.code}>
                <td>
                  <span className="font-semibold">{c.name}</span>
                  {c.primary && <span className="chip chip-gold ml-2">основная</span>}
                </td>
                <td className="mono">{c.code}</td>
                <td className="mono">{c.symbol}</td>
                <td className="mono text-right text-[var(--gold2)]">
                  {c.primary ? "1" : getRate(c.code, prim?.code ?? "")?.toLocaleString("ru-RU", { maximumFractionDigits: 6 }) ?? "—"}
                </td>
                <td className="mono text-right text-[var(--gold2)]">
                  {c.primary ? "1" : getRate(prim?.code ?? "", c.code)?.toLocaleString("ru-RU", { maximumFractionDigits: 6 }) ?? "—"}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

/* ================= новый счёт ================= */

const USER_TYPES: AccountType[] = ["CHECKING", "SAVINGS", "CREDIT", "DEPOSIT"];

function OpenPage({ user, onChanged }: { user: User; onChanged: () => void }) {
  const bank = useBank();
  const pendingN = pendingCountOf(user.login);
  const [type, setType] = useState<AccountType>("CHECKING");
  const [cur, setCur] = useState(primaryCurrency()?.code ?? "ARY");
  const [deposit, setDeposit] = useState("");
  const dep = Number(deposit.replace(",", "."));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = openAccount(user.login, type, cur, { initialDeposit: dep > 0 ? dep : 0 });
    if (res.err) toast(res.err, "err");
    else if (res.acc) {
      toast(`Заявление принято. Номер: ${fmtNum(res.acc.number)}. Статус: на рассмотрении`, "ok");
      setDeposit("");
      onChanged();
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
      <form onSubmit={submit} className="panel fadeUp h-fit p-5">
        <h3 className="display flex items-center gap-2 text-sm font-bold tracking-wider">
          <IcPlus size={15} className="text-[var(--gold)]" /> ЗАЯВЛЕНИЕ НА ОТКРЫТИЕ СЧЁТА
        </h3>
        <div className="goldline my-3" />
        <label className="mono text-[10px] tracking-[0.2em] text-[var(--dim)]">ТИП СЧЁТА</label>
        <select value={type} onChange={(e) => setType(e.target.value as AccountType)} className="field mt-1">
          {USER_TYPES.map((t) => (
            <option key={t} value={t}>
              {ACCOUNT_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
        <label className="mono mt-4 block text-[10px] tracking-[0.2em] text-[var(--dim)]">ВАЛЮТА СЧЁТА</label>
        <select value={cur} onChange={(e) => setCur(e.target.value)} className="field mt-1">
          {bank.currencies.filter((c) => c.active).map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} — {c.name}
            </option>
          ))}
        </select>
        <label className="mono mt-4 block text-[10px] tracking-[0.2em] text-[var(--dim)]">НАЧАЛЬНЫЙ ВЗНОС (НЕОБЯЗАТЕЛЬНО)</label>
        <input
          value={deposit}
          onChange={(e) => setDeposit(e.target.value)}
          className="field mono mt-1"
          placeholder="0,00"
          inputMode="decimal"
        />
        <p className="mono mt-1 text-[9.5px] leading-4 text-[var(--dim)]">
          ВЗНОС СПИСЫВАЕТСЯ С ВАШЕГО РАСЧЁТНОГО СЧЁТА СРАЗУ; КОНВЕРТАЦИЯ — ПО КУРСУ БАНКА.
        </p>
        <button className="btn btn-gold mt-4 w-full" disabled={pendingN >= 2}>
          Подать заявление
        </button>
      </form>

      <div className="flex flex-col gap-4">
        <div className={`panel fadeUp p-5 ${pendingN >= 2 ? "border-[var(--red2)]" : ""}`} style={{ animationDelay: "70ms" }}>
          <p className="mono flex items-center gap-2 text-[11px] tracking-[0.18em]">
            <IcClock size={14} className={pendingN >= 2 ? "text-[var(--red3)]" : "text-[var(--gold)]"} />
            НА РАССМОТРЕНИИ: <span className={pendingN >= 2 ? "text-[var(--red3)]" : "text-[var(--gold2)]"}>{pendingN} ИЗ 2</span>
          </p>
          <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--txt2)]">
            {pendingN >= 2
              ? "Новые счета не принимаются, пока банк не рассмотрит действующие заявления."
              : "Одновременно на рассмотрении могут находиться не более двух заявлений. Решение принимает управляющий банка; статус появится во вкладке «Заявки»."}
          </p>
        </div>
        <div className="panel fadeUp p-5" style={{ animationDelay: "130ms" }}>
          <h4 className="display text-sm font-bold tracking-wider">ПАМЯТКА КЛИЕНТА</h4>
          <ul className="mt-2 space-y-1.5 text-[12.5px] leading-relaxed text-[var(--txt2)]">
            <li>• Расчётный счёт открывается в основной валюте {primaryCurrency()?.code} либо в иностранной.</li>
            <li>• Кредитный счёт предоставляется с лимитом, который устанавливает банк при утверждении.</li>
            <li>• Номер счёта (16 знаков) сообщается сразу и не меняется после активации.</li>
            <li>• Открытие счёта — услуга бесплатная; пошлины за ведение устанавливает Банк.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ================= заявки (pending) ================= */

function PendingPage({ user }: { user: User }) {
  const my = accountsForUser(user.login).filter((a) => a.status === "PENDING");
  return (
    <div className="panel fadeUp overflow-x-auto">
      <div className="px-4 pt-4">
        <h3 className="display text-sm font-bold tracking-wider">ЗАЯВЛЕНИЯ НА РАССМОТРЕНИИ</h3>
      </div>
      <table className="tbl mt-3">
        <thead>
          <tr>
            <th>Номер заявления</th>
            <th>Тип</th>
            <th>Валюта</th>
            <th className="text-right">Взнос</th>
            <th>Подано</th>
            <th>Статус</th>
          </tr>
        </thead>
        <tbody>
          {my.length === 0 && (
            <tr>
              <td colSpan={6} className="mono py-6 text-center text-[12px] text-[var(--dim)]">
                Действующих заявлений нет.
              </td>
            </tr>
          )}
          {my.map((a) => (
            <tr key={a.id}>
              <td className="mono text-[12px]">{fmtNum(a.number)}</td>
              <td>{ACCOUNT_TYPE_LABEL[a.type]}</td>
              <td className="mono">{a.currency}</td>
              <td className="mono text-right">{fmtMoney(a.balance, a.currency)}</td>
              <td className="mono text-[11px] text-[var(--txt2)]">{fmtDT(a.createdAt)}</td>
              <td><span className={statusChip(a.status)}>{ACCOUNT_STATUS_LABEL[a.status]}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ================= детали счёта ================= */

function DetailPage({ acc, user, onBack }: { acc: BankAccount; user: User; onBack: () => void }) {
  const bank = useBank();
  const mine = acc.user === user.login;
  const disp = displayCurrencyOf(user.login);
  const txs = txsForAccount(acc.id);
  const [newCur, setNewCur] = useState("");

  const rateToDisp = acc.currency === disp.code ? null : getRate(acc.currency, disp.code);
  const convDisp = rateToDisp === null ? null : acc.balance * rateToDisp;

  return (
    <div className="siteIn">
      <button onClick={onBack} className="mono mb-4 flex items-center gap-1.5 text-[11px] tracking-[0.18em] text-[var(--gold)] transition-colors hover:text-[var(--gold2)]">
        <IcArrowL size={13} /> К СПИСКУ СЧЕТОВ
      </button>

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="flex flex-col gap-4">
          <div className="panel border-t-2 border-t-[var(--gold)] p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="mono text-[11px] tracking-[0.12em] text-[var(--txt2)]">{fmtNum(acc.number)}</span>
              <span className={statusChip(acc.status)}>{ACCOUNT_STATUS_LABEL[acc.status]}</span>
            </div>
            <p className="mt-2 text-[13px] font-semibold">{ACCOUNT_TYPE_LABEL[acc.type]}</p>
            <p className="mono text-[10px] text-[var(--dim)]">ВЛАДЕЛЕЦ: {ownerName(acc).toUpperCase()}</p>
            <p className="display mt-4 text-4xl font-extrabold text-[var(--gold2)]">{fmtMoney(acc.balance, acc.currency)}</p>
            {convDisp !== null && (
              <p className="mono mt-1 text-[10.5px] text-[var(--txt2)]">
                ≈ {fmtMoney(convDisp, disp.code)} • курс {rateToDisp?.toLocaleString("ru-RU", { maximumFractionDigits: 6 })}
              </p>
            )}
            {acc.type === "CREDIT" && (
              <p className="mono mt-2 text-[10.5px] text-[var(--dim)]">
                ДОСТУПНО: {fmtMoney(availableBalance(acc), acc.currency)} • ЛИМИТ {fmtMoney(acc.creditLimit, acc.currency)}
              </p>
            )}
            {acc.interestRate > 0 && (
              <p className="mono mt-1 text-[10.5px] text-[var(--dim)]">СТАВКА: {acc.interestRate}% ГОДОВЫХ</p>
            )}
          </div>

          {mine && (
            <div className="panel p-5">
              <h4 className="display text-sm font-bold tracking-wider">ДЕЙСТВИЯ</h4>
              <div className="goldline my-3" />
              <div className="flex flex-col gap-2">
                {acc.status === "ACTIVE" && (
                  <button
                    className="btn btn-danger"
                    onClick={() => {
                      const err = setFrozen(acc.id, true);
                      toast(err ?? `Счёт ${fmtNum(acc.number)} заморожен`, err ? "err" : "info");
                    }}
                  >
                    Заморозить счёт
                  </button>
                )}
                {acc.status === "FROZEN" && (
                  <button
                    className="btn"
                    onClick={() => {
                      const err = setFrozen(acc.id, false);
                      toast(err ?? "Счёт разморожен", err ? "err" : "ok");
                    }}
                  >
                    Разморозить счёт
                  </button>
                )}
                {acc.status === "ACTIVE" && (
                  <div className="flex gap-2">
                    <select value={newCur} onChange={(e) => setNewCur(e.target.value)} className="field flex-1">
                      <option value="">Сменить валюту…</option>
                      {bank.currencies
                        .filter((c) => c.active && c.code !== acc.currency)
                        .map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.code} — {c.name}
                          </option>
                        ))}
                    </select>
                    <button
                      className="btn shrink-0"
                      disabled={!newCur}
                      onClick={() => {
                        const err = changeCurrency(acc.id, newCur);
                        toast(err ?? `Валюта счёта: ${newCur} (баланс конвертирован)`, err ? "err" : "ok");
                        setNewCur("");
                      }}
                    >
                      Обменять
                    </button>
                  </div>
                )}
                {acc.status !== "CLOSED" && Math.abs(acc.balance) < 1e-9 && (
                  <button
                    className="btn btn-danger"
                    onClick={() => {
                      if (window.confirm("Закрыть счёт безвозвратно?")) {
                        const err = closeAccount(acc.id);
                        toast(err ?? "Счёт закрыт", err ? "err" : "info");
                        if (!err) onBack();
                      }
                    }}
                  >
                    Закрыть счёт
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="panel p-5">
            <h4 className="display text-sm font-bold tracking-wider">БАЛАНС В ДРУГИХ ВАЛЮТАХ</h4>
            <div className="mt-2">
              {bank.currencies
                .filter((c) => c.active && c.code !== acc.currency)
                .map((c) => {
                  const r = getRate(acc.currency, c.code);
                  return (
                    <div key={c.code} className="flex items-center justify-between border-b border-[var(--line)] py-2 last:border-0">
                      <span className="text-[12.5px] text-[var(--txt2)]">{c.name}</span>
                      <span className="mono text-[12.5px] text-[var(--gold2)]">
                        {r === null ? "нет курса" : fmtMoney(acc.balance * r, c.code)}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        <div className="panel overflow-x-auto">
          <div className="px-4 pt-4">
            <h3 className="display text-sm font-bold tracking-wider">ОПЕРАЦИИ ПО СЧЁТУ</h3>
          </div>
          <div className="mt-2 px-4 pb-4">
            {txs.length === 0 && <p className="mono py-6 text-center text-[12px] text-[var(--dim)]">Операций по счёту не значится.</p>}
            {txs.map((t) => (
              <TxLine key={t.id} tx={t} viewer={user.login} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= касса банка (управляющий) ================= */

function ApprovePage({ onChanged }: { onChanged: () => void }) {
  const pending = pendingAccounts();
  return (
    <div className="panel fadeUp overflow-x-auto">
      <div className="flex items-center justify-between px-4 pt-4">
        <h3 className="display text-sm font-bold tracking-wider">ЗАЯВЛЕНИЯ ОБ ОТКРЫТИИ СЧЕТОВ</h3>
        <span className="mono text-[10px] text-[var(--dim)]">РЕШЕНИЕ ПРИНИМАЕТ УПРАВЛЯЮЩИЙ БАНКА</span>
      </div>
      <table className="tbl mt-3">
        <thead>
          <tr>
            <th>Заявитель</th>
            <th>Номер</th>
            <th>Тип</th>
            <th>Валюта</th>
            <th className="text-right">Взнос</th>
            <th>Подано</th>
            <th className="text-right">Решение</th>
          </tr>
        </thead>
        <tbody>
          {pending.length === 0 && (
            <tr>
              <td colSpan={7} className="mono py-6 text-center text-[12px] text-[var(--dim)]">
                Нерассмотренных заявлений нет.
              </td>
            </tr>
          )}
          {pending.map((a) => (
            <tr key={a.id}>
              <td className="font-semibold">{ownerName(a)}</td>
              <td className="mono text-[12px]">{fmtNum(a.number)}</td>
              <td>{ACCOUNT_TYPE_LABEL[a.type]}</td>
              <td className="mono">{a.currency}</td>
              <td className="mono text-right">{fmtMoney(a.balance, a.currency)}</td>
              <td className="mono text-[11px] text-[var(--txt2)]">{fmtDT(a.createdAt)}</td>
              <td>
                <div className="flex justify-end gap-1.5">
                  <button
                    className="btn btn-gold px-3 py-1.5 text-[10px]"
                    onClick={() => {
                      const err = decideAccount(a.id, true);
                      toast(err ?? `Счёт утверждён и активирован`, err ? "err" : "ok");
                      onChanged();
                    }}
                  >
                    <IcCheck size={13} /> Утвердить
                  </button>
                  <button
                    className="btn btn-danger px-3 py-1.5 text-[10px]"
                    onClick={() => {
                      const err = decideAccount(a.id, false);
                      toast(err ?? "Заявление отклонено", err ? "err" : "info");
                      onChanged();
                    }}
                  >
                    <IcX size={13} /> Отклонить
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GovPage({ onChanged }: { onChanged: () => void }) {
  const bank = useBank();
  const [type, setType] = useState<AccountType>("GOVERNMENT");
  const [name, setName] = useState("");
  const [cur, setCur] = useState(primaryCurrency()?.code ?? "ARY");
  const [balance, setBalance] = useState("");
  const [desc, setDesc] = useState("");
  const govAccs = bank.accounts.filter((a) => a.user === null && a.status !== "CLOSED");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = createGovernmentAccount({
      type,
      currency: cur,
      accountName: name,
      description: desc,
      balance: Number(balance.replace(",", ".")) || 0,
    });
    if (res.err) toast(res.err, "err");
    else if (res.acc) {
      toast(`Государственный счёт открыт: ${fmtNum(res.acc.number)}`, "ok");
      setName("");
      setBalance("");
      setDesc("");
      onChanged();
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
      <form onSubmit={submit} className="panel fadeUp h-fit p-5">
        <h3 className="display flex items-center gap-2 text-sm font-bold tracking-wider">
          <IcDoc size={15} className="text-[var(--gold)]" /> ГОСУДАРСТВЕННЫЙ СЧЁТ
        </h3>
        <div className="goldline my-3" />
        <label className="mono text-[10px] tracking-[0.2em] text-[var(--dim)]">ТИП</label>
        <select value={type} onChange={(e) => setType(e.target.value as AccountType)} className="field mt-1">
          {GOV_TYPES.map((t) => (
            <option key={t} value={t}>
              {ACCOUNT_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
        <label className="mono mt-4 block text-[10px] tracking-[0.2em] text-[var(--dim)]">НАЗНАЧЕНИЕ / ОРГАНИЗАЦИЯ</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="field mt-1" placeholder="Коллегия внутренних дел" />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="mono text-[10px] tracking-[0.2em] text-[var(--dim)]">ВАЛЮТА</label>
            <select value={cur} onChange={(e) => setCur(e.target.value)} className="field mt-1">
              {bank.currencies.filter((c) => c.active).map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mono text-[10px] tracking-[0.2em] text-[var(--dim)]">НАЧАЛЬНЫЙ БАЛАНС</label>
            <input value={balance} onChange={(e) => setBalance(e.target.value)} className="field mono mt-1" placeholder="0,00" />
          </div>
        </div>
        <label className="mono mt-4 block text-[10px] tracking-[0.2em] text-[var(--dim)]">ОПИСАНИЕ</label>
        <input value={desc} onChange={(e) => setDesc(e.target.value)} className="field mt-1" placeholder="Целевое назначение средств" />
        <button className="btn btn-gold mt-4 w-full">Открыть счёт</button>
      </form>

      <div className="panel fadeUp overflow-x-auto" style={{ animationDelay: "70ms" }}>
        <div className="px-4 pt-4">
          <h3 className="display text-sm font-bold tracking-wider">ГОСУДАРСТВЕННЫЕ СЧЕТА ({govAccs.length})</h3>
        </div>
        <table className="tbl mt-3">
          <thead>
            <tr>
              <th>Назначение</th>
              <th>Номер</th>
              <th>Тип</th>
              <th className="text-right">Баланс</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            {govAccs.map((a) => (
              <tr key={a.id}>
                <td>
                  <div className="font-semibold">{a.accountName ?? "—"}</div>
                  {a.description && <div className="text-[11px] text-[var(--txt2)]">{a.description}</div>}
                </td>
                <td className="mono text-[12px]">{fmtNum(a.number)}</td>
                <td>{ACCOUNT_TYPE_LABEL[a.type]}</td>
                <td className="mono text-right text-[var(--gold2)]">{fmtMoney(a.balance, a.currency)}</td>
                <td><span className={statusChip(a.status)}>{ACCOUNT_STATUS_LABEL[a.status]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CreditPage({ onChanged }: { onChanged: () => void }) {
  const [num, setNum] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"DEPOSIT" | "SALARY" | "INTEREST">("SALARY");
  const [desc, setDesc] = useState("");
  const acc = num.replace(/\s/g, "").length === 16 ? accountByNumber(num) : undefined;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!acc) return toast("Счёт не найден", "err");
    const err = credit(acc.id, Number(amount.replace(",", ".")), type, desc || txTypeName(type));
    toast(err ?? `Зачислено ${fmtMoney(Number(amount.replace(",", ".")), acc.currency)}`, err ? "err" : "ok");
    if (!err) {
      setAmount("");
      setDesc("");
      onChanged();
    }
  };

  const [fnum, setFnum] = useState("");
  const facc = fnum.replace(/\s/g, "").length === 16 ? accountByNumber(fnum) : undefined;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <form onSubmit={submit} className="panel fadeUp h-fit p-5">
        <h3 className="display flex items-center gap-2 text-sm font-bold tracking-wider">
          <IcPlus size={15} className="text-[var(--gold)]" /> ЗАЧИСЛЕНИЕ СРЕДСТВ
        </h3>
        <div className="goldline my-3" />
        <label className="mono text-[10px] tracking-[0.2em] text-[var(--dim)]">СЧЁТ ПОЛУЧАТЕЛЯ</label>
        <input
          value={fmtNum(num.replace(/\s/g, "").toUpperCase().slice(0, 16))}
          onChange={(e) => setNum(e.target.value.replace(/\s/g, "").toUpperCase().slice(0, 16))}
          className="field mono mt-1"
          placeholder="0000 0000 0000 0000"
        />
        <p className="mono mt-1 h-4 text-[10.5px]">
          {num.length === 16 && (acc ? (
            <span className="text-[var(--gold2)]">{ownerName(acc)} • {ACCOUNT_TYPE_LABEL[acc.type]}</span>
          ) : (
            <span className="text-[var(--red3)]">Счёт не найден</span>
          ))}
        </p>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <div>
            <label className="mono text-[10px] tracking-[0.2em] text-[var(--dim)]">СУММА{acc ? `, ${acc.currency}` : ""}</label>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} className="field mono mt-1" placeholder="0,00" />
          </div>
          <div>
            <label className="mono text-[10px] tracking-[0.2em] text-[var(--dim)]">ОСНОВАНИЕ</label>
            <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className="field mt-1">
              <option value="DEPOSIT">Пополнение</option>
              <option value="SALARY">Жалованье</option>
              <option value="INTEREST">Проценты</option>
            </select>
          </div>
        </div>
        <label className="mono mt-4 block text-[10px] tracking-[0.2em] text-[var(--dim)]">НАЗНАЧЕНИЕ</label>
        <input value={desc} onChange={(e) => setDesc(e.target.value)} className="field mt-1" placeholder="Жалованье за месяц" />
        <button className="btn btn-gold mt-4 w-full" disabled={!acc || !(Number(amount.replace(",", ".")) > 0)}>
          Зачислить
        </button>
      </form>

      <div className="panel fadeUp h-fit p-5" style={{ animationDelay: "70ms" }}>
        <h3 className="display flex items-center gap-2 text-sm font-bold tracking-wider">
          <IcUsers size={15} className="text-[var(--gold)]" /> ЗАМОРАЖИВАНИЕ СЧЕТОВ
        </h3>
        <div className="goldline my-3" />
        <label className="mono text-[10px] tracking-[0.2em] text-[var(--dim)]">СЧЁТ</label>
        <input
          value={fmtNum(fnum.replace(/\s/g, "").toUpperCase().slice(0, 16))}
          onChange={(e) => setFnum(e.target.value.replace(/\s/g, "").toUpperCase().slice(0, 16))}
          className="field mono mt-1"
          placeholder="0000 0000 0000 0000"
        />
        <p className="mono mt-1 h-4 text-[10.5px]">
          {fnum.length === 16 && (facc ? (
            <span className="text-[var(--gold2)]">
              {ownerName(facc)} • {ACCOUNT_STATUS_LABEL[facc.status]}
            </span>
          ) : (
            <span className="text-[var(--red3)]">Счёт не найден</span>
          ))}
        </p>
        <div className="mt-3 flex gap-2">
          <button
            className="btn btn-danger flex-1"
            disabled={!facc || facc.status !== "ACTIVE"}
            onClick={() => {
              const err = facc && setFrozen(facc.id, true);
              toast(err ?? "Счёт заморожен", err ? "err" : "info");
            }}
          >
            Заморозить
          </button>
          <button
            className="btn flex-1"
            disabled={!facc || facc.status !== "FROZEN"}
            onClick={() => {
              const err = facc && setFrozen(facc.id, false);
              toast(err ?? "Счёт разморожен", err ? "err" : "ok");
            }}
          >
            Разморозить
          </button>
        </div>
        <p className="mono mt-3 text-[9.5px] leading-4 text-[var(--dim)]">
          ЗАМОРОЗКА ПРИМЕНЯЕТСЯ ПО РЕШЕНИЮ БАНКА ИЛИ ТРИБУНАЛА. ЗАПИСЬ ВНОСИТСЯ В ЖУРНАЛ АУДИТА.
        </p>
      </div>
    </div>
  );
}

/* профиль */

function ProfilePage({ user }: { user: User }) {
  const bank = useBank();
  const prof = profileOf(user.login);
  const disp = displayCurrencyOf(user.login);
  const [phone, setPhone] = useState(prof.phone ?? user.giks);
  const [email, setEmail] = useState(prof.email ?? "");
  const [address, setAddress] = useState(prof.address ?? "");

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="panel fadeUp p-5">
        <h3 className="display text-sm font-bold tracking-wider">ДОСЬЕ КЛИЕНТА</h3>
        <div className="goldline my-3" />
        <div className="space-y-2.5 text-[13px]">
          <p>ИМЯ: <span className="text-[var(--gold2)]">{user.name}</span></p>
          <p className="mono">IŦIRINIO: <span className="break-all text-[var(--gold2)]">{user.itirinio}</span></p>
          <p className="mono">ГИКС: <span className="text-[var(--gold2)]">{user.giks}</span></p>
          <p>СОСЛОВИЕ: <span className="text-[var(--gold2)]">{roleLabel(user.role)}</span></p>
          <p className="mono">КЛИЕНТ С: <span className="text-[var(--gold2)]">{fmtDT(user.createdAt)}</span></p>
        </div>
        <label className="mono mt-5 block text-[10px] tracking-[0.2em] text-[var(--dim)]">ВАЛЮТА ОТОБРАЖЕНИЯ</label>
        <select
          value={disp.code}
          onChange={(e) => {
            setDisplayCurrency(user.login, e.target.value);
            toast(`Валюта отображения: ${e.target.value}`, "info");
          }}
          className="field mt-1"
        >
          {bank.currencies.filter((c) => c.active).map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} — {c.name}
            </option>
          ))}
        </select>
      </div>

      <form
        className="panel fadeUp h-fit p-5"
        style={{ animationDelay: "70ms" }}
        onSubmit={(e) => {
          e.preventDefault();
          saveProfile(user.login, { phone, email, address });
          toast("Контактные данные обновлены");
        }}
      >
        <h3 className="display text-sm font-bold tracking-wider">КОНТАКТНЫЕ ДАННЫЕ</h3>
        <div className="goldline my-3" />
        <label className="mono text-[10px] tracking-[0.2em] text-[var(--dim)]">ТЕЛЕФОН (ГИКС)</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} className="field mono mt-1" />
        <label className="mono mt-4 block text-[10px] tracking-[0.2em] text-[var(--dim)]">ПОЧТОВЫЙ ЯЩИК КЭП</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} className="field mt-1" placeholder="имя@post.arg" />
        <label className="mono mt-4 block text-[10px] tracking-[0.2em] text-[var(--dim)]">АДРЕС</label>
        <input value={address} onChange={(e) => setAddress(e.target.value)} className="field mt-1" placeholder="Префектура, улица, дом" />
        <button className="btn btn-gold mt-4 w-full">Сохранить</button>
      </form>
    </div>
  );
}
