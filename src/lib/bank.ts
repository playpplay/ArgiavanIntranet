import { useSyncExternalStore } from "react";
import { getDB, addLog } from "./db";

/* ============================================================
   StatusBanko • Argian Nazional Bank V1.6 — модель данных.
   Повторяет Django-модели BankProject (models.py):
   Currency, ExchangeRate, TransactionType, Account, Transaction.
   Боевой контур: отдельная БД Django-проекта банка (sb.arg:8001).
   ============================================================ */

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  primary: boolean;
  active: boolean;
}
export interface Rate {
  from: string;
  to: string;
  rate: number;
  active: boolean;
}
export interface TxType {
  code: string;
  name: string;
  positive: boolean;
  active: boolean;
}
export type AccountType =
  | "CHECKING"
  | "SAVINGS"
  | "CREDIT"
  | "TAX"
  | "DEPOSIT"
  | "GOVERNMENT"
  | "RESERVE"
  | "TREASURY";
export type AccountStatus = "ACTIVE" | "PENDING" | "FROZEN" | "CLOSED";

export interface BankAccount {
  id: string;
  user: string | null; // login владельца; null — государственный (без владельца)
  number: string; // 16-значный номер счёта
  type: AccountType;
  currency: string;
  balance: number;
  creditLimit: number;
  interestRate: number;
  status: AccountStatus;
  active: boolean;
  accountName?: string;
  description?: string;
  createdAt: number;
}
export interface BankTx {
  id: string;
  from: string | null; // id счёта-отправителя (null — внешнее поступление)
  to: string; // id счёта-получателя
  type: string; // код TxType
  amount: number; // сумма в валюте получателя
  originalAmount: number; // сумма в валюте отправителя
  rate: number | null;
  desc: string;
  ts: number;
  completed: boolean;
}

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  CHECKING: "Основной (расчётный)",
  SAVINGS: "Накопительный",
  CREDIT: "Кредитный",
  TAX: "Налоговый",
  DEPOSIT: "Депозитный",
  GOVERNMENT: "Государственный",
  RESERVE: "Резервный",
  TREASURY: "Казначейский",
};
export const ACCOUNT_STATUS_LABEL: Record<AccountStatus, string> = {
  ACTIVE: "Активен",
  PENDING: "На рассмотрении",
  FROZEN: "Заморожен",
  CLOSED: "Закрыт",
};
export const GOV_TYPES: AccountType[] = ["GOVERNMENT", "RESERVE", "TREASURY", "TAX"];

export interface BankProfile {
  display?: string; // валюта отображения
  phone?: string;
  email?: string;
  address?: string;
}
interface BankDB {
  v: number;
  currencies: Currency[];
  rates: Rate[];
  txTypes: TxType[];
  accounts: BankAccount[];
  txs: BankTx[];
  prefs: Record<string, BankProfile>;
}

const KEY = "argnet-bank-v1";
const NOW = Date.now();
const D = 86_400_000;

function genNumber(): string {
  const hex = "0123456789ABCDEF";
  let s = "";
  for (let i = 0; i < 16; i++) s += hex[Math.floor(Math.random() * 16)];
  return s;
}
const uid = () => Math.random().toString(36).slice(2, 10);

function seed(): BankDB {
  const krol = getDB().users.find((u) => u.role === "root");
  const bank = getDB().users.find((u) => u.login === "statusbanko");
  const citizens = getDB().users.filter((u) => u.role === "citizen");

  const acc = (
    user: string | null,
    type: AccountType,
    currency: string,
    balance: number,
    extra: Partial<BankAccount> = {}
  ): BankAccount => ({
    id: uid(),
    user,
    number: genNumber(),
    type,
    currency,
    balance,
    creditLimit: 0,
    interestRate: 0,
    status: "ACTIVE",
    active: true,
    createdAt: NOW - 200 * D,
    ...extra,
  });

  const treasury = acc(null, "TREASURY", "ARY", 12_500_000, {
    accountName: "Казначейство Империи Аргия",
    description: "Единый казначейский счёт государственных средств.",
  });
  const taxAcc = acc(null, "TAX", "ARY", 480_000, {
    accountName: "Налоговый счёт Короны",
    description: "Поступление податей и сборов.",
  });
  const krolAcc = krol ? acc(krol.login, "CHECKING", "ARY", 25_000) : null;
  const bankAcc = bank ? acc(bank.login, "CHECKING", "ARY", 1_900_000) : null;
  const citAccs = citizens.map((c, i) =>
    acc(c.login, i % 2 ? "SAVINGS" : "CHECKING", "ARY", 3_500 + i * 1_250)
  );

  const accounts = [treasury, taxAcc, ...(krolAcc ? [krolAcc] : []), ...(bankAcc ? [bankAcc] : []), ...citAccs];

  return {
    v: 1,
    currencies: [
      { code: "ARY", name: "Аргские Йены", symbol: "¥", primary: true, active: true },
      { code: "RUB", name: "Рубли", symbol: "₽", primary: false, active: true },
      { code: "USD", name: "Доллары США", symbol: "$", primary: false, active: true },
      { code: "EUR", name: "Евро", symbol: "€", primary: false, active: true },
    ],
    rates: [
      { from: "ARY", to: "RUB", rate: 0.03, active: true },
      { from: "RUB", to: "ARY", rate: 33.33, active: true },
      { from: "ARY", to: "USD", rate: 0.01, active: true },
      { from: "USD", to: "ARY", rate: 100, active: true },
    ],
    txTypes: [
      { code: "TRANSFER", name: "Перевод", positive: false, active: true },
      { code: "DEPOSIT", name: "Пополнение", positive: true, active: true },
      { code: "WITHDRAWAL", name: "Снятие", positive: false, active: true },
      { code: "TAX_DEDUCTION", name: "Налоговый вычет", positive: false, active: true },
      { code: "FEE", name: "Комиссия", positive: false, active: true },
      { code: "INTEREST", name: "Начисление процентов", positive: true, active: true },
    ],
    accounts,
    txs: [],
    prefs: {},
  };
}

/* ---------- хранилище ---------- */

let cache: BankDB | null = null;
let version = 0;
const subs = new Set<() => void>();

export function subscribeBank(fn: () => void) {
  subs.add(fn);
  return () => {
    subs.delete(fn);
  };
}
export function getBank(): BankDB {
  if (!cache) cache = load();
  return cache;
}
function load(): BankDB {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as BankDB;
      if (p && Array.isArray(p.accounts)) {
        if (!p.prefs) p.prefs = {};
        return p;
      }
    }
  } catch {
    /* повреждено — пересоздаём */
  }
  const db = seed();
  persist(db);
  return db;
}
function persist(db: BankDB) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    /* квота */
  }
}
function mutate(fn: (db: BankDB) => void) {
  const db = getBank();
  fn(db);
  persist(db);
  version++;
  subs.forEach((f) => f());
}
export function useBank(): BankDB {
  useSyncExternalStore(subscribeBank, () => version);
  return getBank();
}

/* ---------- курсы (повторяет ExchangeRate.get_current_rate) ---------- */

export function currency(code: string): Currency | undefined {
  return getBank().currencies.find((c) => c.code === code);
}
export function primaryCurrency(): Currency | undefined {
  return getBank().currencies.find((c) => c.primary && c.active);
}

export function getRate(from: string, to: string, visited?: Set<string>): number | null {
  if (from === to) return 1;
  const b = getBank();
  const key = `${from}>${to}`;
  if (visited?.has(key)) return null;
  (visited ??= new Set()).add(key);

  const direct = b.rates.find((r) => r.from === from && r.to === to && r.active);
  if (direct) return direct.rate;
  const rev = b.rates.find((r) => r.from === to && r.to === from && r.active);
  if (rev && rev.rate) return 1 / rev.rate;

  const prim = primaryCurrency();
  if (prim && prim.code !== from && prim.code !== to) {
    const r1 = getRate(from, prim.code, new Set(visited));
    const r2 = getRate(prim.code, to, new Set(visited));
    if (r1 && r2) return r1 * r2;
  }
  return null;
}

export function convert(amount: number, from: string, to: string): number | null {
  if (from === to) return amount;
  const r = getRate(from, to);
  return r === null ? null : amount * r;
}

/* ---------- счета ---------- */

export const fmtMoney = (n: number, code: string) =>
  `${n.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ${currency(code)?.symbol ?? code}`;

export function availableBalance(a: BankAccount): number {
  return a.type === "CREDIT" ? a.balance + a.creditLimit : a.balance;
}

export function accountsForUser(login: string): BankAccount[] {
  return getBank()
    .accounts.filter((a) => a.user === login && a.status !== "CLOSED")
    .sort((a, b) => b.createdAt - a.createdAt);
}
export function accountByNumber(num: string): BankAccount | undefined {
  const n = num.replace(/\s/g, "").toUpperCase();
  return getBank().accounts.find((a) => a.number === n);
}
export function accountById(id: string): BankAccount | undefined {
  return getBank().accounts.find((a) => a.id === id);
}
export function ownerName(a: BankAccount): string {
  if (a.user) {
    const u = getDB().users.find((x) => x.login === a.user);
    return u ? u.name : a.user;
  }
  return a.accountName ?? "Государственный (без владельца)";
}

export function pendingCountOf(login: string): number {
  return getBank().accounts.filter((a) => a.user === login && a.status === "PENDING" && a.active).length;
}

/** Заявление на счёт. Начальный взнос сразу списывается с расчётного счёта (как в Django-банке). */
export function openAccount(
  login: string,
  type: AccountType,
  currencyCode: string,
  opts: { creditLimit?: number; interestRate?: number; accountName?: string; description?: string; initialDeposit?: number } = {}
): { err?: string; acc?: BankAccount } {
  const cur = currency(currencyCode);
  if (!cur || !cur.active) return { err: "Валюта не найдена или не действует" };
  if (GOV_TYPES.includes(type)) return { err: "Государственные счета открывает только Канцелярия банка" };
  if (pendingCountOf(login) >= 2)
    return { err: "У вас уже 2 счёта на рассмотрении — новые заявления не принимаются" };

  const deposit = opts.initialDeposit ?? 0;
  let source: BankAccount | null = null;
  let withdraw = 0;

  if (deposit > 0) {
    const checking = getBank().accounts.filter(
      (a) => a.user === login && a.type === "CHECKING" && a.active && a.status === "ACTIVE"
    );
    for (const a of checking) {
      if (a.currency === currencyCode) {
        if (a.balance >= deposit) {
          source = a;
          withdraw = deposit;
          break;
        }
      } else {
        const r = getRate(a.currency, currencyCode);
        if (r) {
          const need = deposit / r;
          if (a.balance >= need) {
            source = a;
            withdraw = need;
            break;
          }
        }
      }
    }
    if (!source) return { err: "Недостаточно средств на расчётных счетах для начального взноса" };
  }

  const acc: BankAccount = {
    id: uid(),
    user: login,
    number: genNumber(),
    type,
    currency: currencyCode,
    balance: deposit,
    creditLimit: opts.creditLimit ?? 0,
    interestRate: opts.interestRate ?? 0,
    status: "PENDING",
    active: true,
    createdAt: Date.now(),
  };
  mutate((db) => {
    if (source) {
      const s = db.accounts.find((x) => x.id === source!.id);
      if (s) s.balance -= withdraw;
    }
    db.accounts.push(acc);
    if (source) {
      db.txs.unshift({
        id: uid(),
        from: source.id,
        to: acc.id,
        type: "WITHDRAWAL",
        amount: withdraw,
        originalAmount: withdraw,
        rate: source.currency === currencyCode ? null : getRate(source.currency, currencyCode),
        desc: `Начальный взнос на новый ${ACCOUNT_TYPE_LABEL[type].toLowerCase()} счёт (ожидает активации)`,
        ts: Date.now(),
        completed: true,
      });
      db.txs.unshift({
        id: uid(),
        from: null,
        to: acc.id,
        type: "DEPOSIT",
        amount: deposit,
        originalAmount: deposit,
        rate: null,
        desc: "Начальный взнос (ожидает активации счёта)",
        ts: Date.now(),
        completed: true,
      });
    }
  });
  addLog(`StatusBanko: заявление ${acc.number} (${ACCOUNT_TYPE_LABEL[type]}, ${currencyCode}) от ${login}`);
  return { acc };
}

export function createGovernmentAccount(d: {
  type: AccountType;
  currency: string;
  accountName: string;
  description?: string;
  balance?: number;
}): { err?: string; acc?: BankAccount } {
  if (!GOV_TYPES.includes(d.type)) return { err: "Тип не относится к государственным счетам" };
  const cur = currency(d.currency);
  if (!cur || !cur.active) return { err: "Валюта не найдена или не действует" };
  if (!d.accountName.trim()) return { err: "Укажите название счёта" };
  const acc: BankAccount = {
    id: uid(),
    user: null,
    number: genNumber(),
    type: d.type,
    currency: d.currency,
    balance: d.balance ?? 0,
    creditLimit: 0,
    interestRate: 0,
    status: "ACTIVE",
    active: true,
    accountName: d.accountName.trim(),
    description: d.description?.trim() || undefined,
    createdAt: Date.now(),
  };
  mutate((db) => db.accounts.push(acc));
  addLog(`StatusBanko: открыт государственный счёт «${acc.accountName}» (${d.type})`);
  return { acc };
}

export function decideAccount(id: string, approve: boolean): string | null {
  const a = accountById(id);
  if (!a) return "Счёт не найден";
  if (a.status !== "PENDING") return "Счёт не на рассмотрении";
  mutate((db) => {
    const t = db.accounts.find((x) => x.id === id);
    if (!t) return;
    if (approve) t.status = "ACTIVE";
    else {
      t.status = "CLOSED";
      t.active = false;
    }
  });
  addLog(`StatusBanko: счёт ${a.number} ${approve ? "утверждён" : "отклонён"}`);
  return null;
}

export function setFrozen(id: string, frozen: boolean): string | null {
  const a = accountById(id);
  if (!a) return "Счёт не найден";
  if (frozen && a.status !== "ACTIVE") return "Заморозить можно только активный счёт";
  mutate((db) => {
    const t = db.accounts.find((x) => x.id === id);
    if (t) t.status = frozen ? "FROZEN" : "ACTIVE";
  });
  addLog(`StatusBanko: счёт ${a.number} ${frozen ? "заморожен" : "разморожен"}`);
  return null;
}

export function closeAccount(id: string): string | null {
  const a = accountById(id);
  if (!a) return "Счёт не найден";
  if (Math.abs(a.balance) > 1e-9) return "На счёте остаток — сначала выведите средства";
  mutate((db) => {
    const t = db.accounts.find((x) => x.id === id);
    if (t) {
      t.status = "CLOSED";
      t.active = false;
    }
  });
  addLog(`StatusBanko: счёт ${a.number} закрыт`);
  return null;
}

/** Смена валюты счёта: баланс конвертируется по действующему курсу. */
export function changeCurrency(id: string, newCode: string): string | null {
  const a = accountById(id);
  if (!a) return "Счёт не найден";
  if (a.status !== "ACTIVE") return "Операция доступна только для активного счёта";
  if (newCode === a.currency) return "Счёт уже в этой валюте";
  const conv = convert(a.balance, a.currency, newCode);
  if (conv === null) return `Нет курса ${a.currency} → ${newCode}`;
  const old = a.currency;
  mutate((db) => {
    const t = db.accounts.find((x) => x.id === id);
    if (t) t.currency = newCode;
    t && (t.balance = conv);
  });
  recordTx(null, id, "EXCHANGE", conv, a.balance, getRate(old, newCode), `Смена валюты счёта: ${old} → ${newCode}`);
  addLog(`StatusBanko: счёт ${a.number} переведён в ${newCode}`);
  return null;
}

/* ---------- операции ---------- */

function recordTx(
  from: string | null,
  to: string,
  type: string,
  amount: number,
  originalAmount: number,
  rate: number | null,
  desc: string
) {
  const tx: BankTx = {
    id: uid(),
    from,
    to,
    type,
    amount,
    originalAmount,
    rate,
    desc,
    ts: Date.now(),
    completed: true,
  };
  mutate((db) => db.txs.unshift(tx));
}

/** Перевод между счетами (с конвертацией валют по курсу банка). */
export function transfer(d: {
  fromId: string;
  toNumber: string;
  amount: number;
  desc: string;
}): { err?: string; tx?: BankTx } {
  const from = accountById(d.fromId);
  if (!from) return { err: "Счёт отправителя не найден" };
  if (from.status !== "ACTIVE") return { err: `Счёт отправителя в статусе «${ACCOUNT_STATUS_LABEL[from.status]}»` };
  const to = accountByNumber(d.toNumber);
  if (!to) return { err: "Счёт получателя по номеру не найден" };
  if (to.id === from.id) return { err: "Нельзя перевести на тот же счёт" };
  if (to.status === "CLOSED") return { err: "Счёт получателя закрыт" };
  if (to.status === "FROZEN") return { err: "Счёт получателя заморожен" };
  if (!(d.amount > 0)) return { err: "Сумма должна быть положительной" };
  if (availableBalance(from) < d.amount) return { err: "Недостаточно средств на счёте" };

  const rate = from.currency === to.currency ? null : getRate(from.currency, to.currency);
  if (rate === null) return { err: `Нет курса ${from.currency} → ${to.currency}` };
  const credited = rate === null ? d.amount : d.amount * rate;

  mutate((db) => {
    const f = db.accounts.find((x) => x.id === from.id);
    const t = db.accounts.find((x) => x.id === to.id);
    if (f) f.balance -= d.amount;
    if (t) t.balance += credited;
  });
  const tx: BankTx = {
    id: uid(),
    from: from.id,
    to: to.id,
    type: "TRANSFER",
    amount: credited,
    originalAmount: d.amount,
    rate,
    desc: d.desc.trim() || `Перевод между счетами через ${primaryCurrency()?.code ?? "ARY"}`,
    ts: Date.now(),
    completed: true,
  };
  mutate((db) => {
    db.txs.unshift(tx);
  });
  addLog(`StatusBanko: перевод ${fmtMoney(d.amount, from.currency)} → счёт ${to.number.slice(0, 4)}…${to.number.slice(-4)}`);
  return { tx };
}

/** Уплата подати: списание на налоговый счёт Короны. */
export function payTax(fromId: string, amount: number, desc: string): { err?: string } {
  const from = accountById(fromId);
  if (!from) return { err: "Счёт не найден" };
  if (from.status !== "ACTIVE") return { err: "Счёт не активен" };
  if (!(amount > 0)) return { err: "Сумма должна быть положительной" };
  if (availableBalance(from) < amount) return { err: "Недостаточно средств" };
  const tax = getBank().accounts.find((a) => a.type === "TAX" && a.status === "ACTIVE");
  if (!tax) return { err: "Налоговый счёт Короны не открыт" };
  const rate = from.currency === tax.currency ? null : getRate(from.currency, tax.currency);
  if (rate === null) return { err: "Нет курса к валюте налогового счёта" };
  mutate((db) => {
    const f = db.accounts.find((x) => x.id === from.id);
    const t = db.accounts.find((x) => x.id === tax.id);
    if (f) f.balance -= amount;
    if (t) t.balance += (rate ?? 1) * amount;
  });
  recordTx(from.id, tax.id, "TAX_DEDUCTION", (rate ?? 1) * amount, amount, rate, desc.trim() || "Налоговый вычет");
  addLog(`StatusBanko: подать ${fmtMoney(amount, from.currency)} от ${from.user ?? "казны"}`);
  return {};
}

/** Зачисление (жалованье, проценты, пополнение) — доступно банку/Короне. */
export function credit(toId: string, amount: number, type: "DEPOSIT" | "SALARY" | "INTEREST", desc: string): string | null {
  const to = accountById(toId);
  if (!to) return "Счёт не найден";
  if (to.status !== "ACTIVE") return "Счёт не активен";
  if (!(amount > 0)) return "Сумма должна быть положительной";
  mutate((db) => {
    const t = db.accounts.find((x) => x.id === toId);
    if (t) t.balance += amount;
  });
  recordTx(null, toId, type, amount, amount, null, desc.trim() || "Зачисление");
  addLog(`StatusBanko: зачисление ${fmtMoney(amount, to.currency)} на ${to.number.slice(0, 4)}…`);
  return null;
}

/* ---------- выборки ---------- */

export function txsForAccount(id: string): BankTx[] {
  return getBank()
    .txs.filter((t) => t.from === id || t.to === id)
    .sort((a, b) => b.ts - a.ts);
}

export function pendingAccounts(): BankAccount[] {
  return getBank().accounts.filter((a) => a.status === "PENDING");
}

/** Права управляющего банком: Корона (root) и само ЮЛ StatusBanko. */
export function isBankOfficer(login: string, role: string): boolean {
  return role === "root" || login === "statusbanko";
}

/* ---------- настройки клиента (валюта отображения, контакты) ---------- */

export function profileOf(login: string): BankProfile {
  return getBank().prefs[login] ?? {};
}

export function displayCurrencyOf(login: string): Currency {
  const p = profileOf(login);
  const c = p.display ? currency(p.display) : undefined;
  return c && c.active ? c : primaryCurrency() ?? getBank().currencies[0];
}

export function setDisplayCurrency(login: string, code: string): string | null {
  if (!currency(code)) return "Валюта не найдена";
  mutate((db) => {
    db.prefs[login] = { ...(db.prefs[login] ?? {}), display: code };
  });
  return null;
}

export function saveProfile(login: string, patch: Omit<BankProfile, "display">) {
  mutate((db) => {
    db.prefs[login] = { ...(db.prefs[login] ?? {}), ...patch };
  });
}

export function txTypeName(code: string): string {
  return getBank().txTypes.find((t) => t.code === code)?.name ?? code;
}
