import { useSyncExternalStore } from "react";

/* ============================================================
   ЕГИКС ARG-NET • единый реестр (прототип, localStorage).
   Боевой контур: Django + PostgreSQL, эндпоинты — см. api.ts
   ============================================================ */

export type Role = string; // идентификатор сословия из реестра ролей
export type SiteKind = "portal" | "mail" | "voip" | "admin" | "bank" | "service" | "reserved";

/** Сословие (роль) из Государственного реестра сословий. */
export interface RoleDef {
  id: string;
  label: string;
  prefix: string; // паттерн ГиКС, напр. "12", "24-01"
  seq: 3 | 5; // разрядность порядкового номера
  usePref: boolean; // включать код префектуры в номер ГиКС
  admin: boolean; // доступ к Канцелярии
  legal: boolean; // сословие юридического лица
  builtin?: boolean;
}
/** Префектура из реестра (Указ №24 и последующие расширения). */
export interface PrefDef {
  code: string; // 2 цифры
  name: string;
  builtin?: boolean;
}

export interface User {
  login: string;
  itirinio: string; // номер паспорта: 000000000000-000000000000
  name: string;
  password: string;
  role: Role;
  giks: string; // номер внутренней телефонии ГиКС
  pref: string; // код префектуры (Указ №24)
  blocked: boolean;
  createdAt: number;
}
export interface Zone {
  tld: string;
  desc: string;
  createdAt: number;
  system?: boolean;
}
export interface Domain {
  name: string;
  tld: string;
  kind: SiteKind;
  owner: string; // login владельца
  desc: string;
  port: number;
  hosted: boolean; // true — служба на узле поднята; false — адрес выделен, службы нет
  createdAt: number;
  system?: boolean;
  mirror?: boolean;
}
export interface EmailMsg {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  ts: number;
  read: boolean;
  folder: "in" | "out";
  trashed: boolean;
}
export interface CallRec {
  id: string;
  from: string;
  to: string;
  ts: number;
  duration: number;
  status: "ok" | "missed" | "declined" | "noanswer";
}
export interface Tx {
  id: string;
  from: string;
  to: string;
  amount: number;
  purpose: string;
  ts: number;
}
export interface LogEntry {
  ts: number;
  text: string;
}
export interface DB {
  v: number;
  users: User[];
  roles: RoleDef[];
  prefs: PrefDef[];
  zones: Zone[];
  domains: Domain[];
  emails: EmailMsg[];
  calls: CallRec[];
  txs: Tx[];
  log: LogEntry[];
}

export function roleDef(id: Role): RoleDef | undefined {
  return getDB().roles.find((r) => r.id === id);
}
export function roleLabel(id: Role): string {
  return roleDef(id)?.label ?? id;
}
/** Мандат доступа к Канцелярии (root или сословие с правом оператора). */
export function isAdmin(u: User): boolean {
  return u.role === "root" || roleDef(u.role)?.admin === true;
}

export const KIND_LABEL: Record<SiteKind, string> = {
  portal: "Портал",
  mail: "Почта (КЭП)",
  voip: "Телефония (ГИКС)",
  admin: "Канцелярия",
  bank: "Банк (StatusBanko)",
  service: "Служебный узел",
  reserved: "Домен выделен",
};

export const KIND_LETTER: Record<SiteKind, string> = {
  portal: "П",
  mail: "М",
  voip: "Т",
  admin: "У",
  bank: "Б",
  service: "С",
  reserved: "—",
};



export const LEGAL_SHORT =
  "Собственность Империи Аргия • Ст. 123 ROTTO • КГТ Ст. 1 (187): трафик анализируется ГНИЦСТ";

export const LEGAL_FULL = [
  "Настоящая информационная сеть является собственностью Империи Аргия.",
  "В соответствии со Статьёй 123 ROTTO любое лицо, находящееся в цифровом или физическом периметре ИА, обязано соблюдать законы Империи.",
  "В соответствии со Статьёй 1 (187) КГТ все действия, транзакции e-T, почтовые отправления и журналы вызовов ГИКС автоматически анализируются алгоритмами ГНИЦСТ на предмет соответствия Закону Toqorro.",
  "Право на неприкосновенность переписки (Ст. 13.1 (22) Toqorro) может быть ограничено по решению Военного или Государственного трибунала в интересах безопасности Империи.",
  "Использование сети для распространения КГТ, критики монархического строя или организации несанкционированных собраний влечёт уголовную ответственность по Ст. 2 (66) и Ст. 3 (67) УК ИА.",
];

/* ---------- сид ---------- */

const KEY = "argnet-db-v4";
const SKEY = "argnet-session-v4";
const H = 3_600_000;
const D = 24 * H;
const NOW = Date.now();

function seed(): DB {
  return {
    v: 3,
    users: [
      {
        login: "krol",
        itirinio: "000000000000-000000000001",
        name: "Аргольд IV, Император Аргии",
        password: "arg-root",
        role: "root",
        giks: "12-001-4",
        pref: "00",
        blocked: false,
        createdAt: NOW - 780 * D,
      },
      {
        login: "arcanum",
        itirinio: "401277915320-883002174415",
        name: "Смотритель тайной связи",
        password: "arg-tech",
        role: "tech",
        giks: "24-12-010-0",
        pref: "00",
        blocked: false,
        createdAt: NOW - 700 * D,
      },
      {
        login: "moder",
        itirinio: "512208347761-902114530087",
        name: "Дежурный цензор Стражи",
        password: "arg-mod",
        role: "moderator",
        giks: "24-01-011-9",
        pref: "00",
        blocked: false,
        createdAt: NOW - 400 * D,
      },
      {
        login: "kollegia",
        itirinio: "603915228407-114709263358",
        name: "Секретарь Коллегии внутренних дел",
        password: "arg-oper",
        role: "operator",
        giks: "12-005-8",
        pref: "00",
        blocked: false,
        createdAt: NOW - 400 * D,
      },
      {
        login: "ivanov",
        itirinio: "718442906513-229518074460",
        name: "Иванов А. П.",
        password: "arg-civ",
        role: "citizen",
        giks: "17-00-00042-4",
        pref: "00",
        blocked: false,
        createdAt: NOW - 120 * D,
      },
      {
        login: "statusbanko",
        itirinio: "900230010005-001002277931",
        name: "StatusBanko, Государственный Банк",
        password: "arg-bank",
        role: "legal",
        giks: "23-00-10005-1",
        pref: "00",
        blocked: false,
        createdAt: NOW - 300 * D,
      },
    ],
    roles: [
      { id: "root", label: "Верховный Администратор", prefix: "12", seq: 3, usePref: false, admin: true, legal: false, builtin: true },
      { id: "operator", label: "Оператор Коллегии", prefix: "12", seq: 3, usePref: false, admin: true, legal: false, builtin: true },
      { id: "citizen", label: "Ťivitano", prefix: "17", seq: 5, usePref: true, admin: false, legal: false, builtin: true },
      { id: "legal", label: "Юридическое лицо", prefix: "23-00", seq: 5, usePref: false, admin: false, legal: true, builtin: true },
      { id: "tech", label: "Технический специалист", prefix: "24-12", seq: 3, usePref: false, admin: false, legal: false, builtin: true },
      { id: "moderator", label: "Модератор", prefix: "24-01", seq: 3, usePref: false, admin: false, legal: false, builtin: true },
    ],
    prefs: [
      { code: "00", name: "Столица Йент", builtin: true },
      { code: "01", name: "Префектура Наго", builtin: true },
      { code: "02", name: "Префектура Накио", builtin: true },
      { code: "03", name: "Префектура Ярикава", builtin: true },
      { code: "04", name: "Префектура Кагиото", builtin: true },
      { code: "05", name: "Префектура Канаканэ", builtin: true },
      { code: "06", name: "Провинция Катэ", builtin: true },
      { code: "99", name: "Служебные коды", builtin: true },
    ],
    zones: [
      { tld: "arg", desc: "Государственная зона Империи: учреждения, службы, официальные узлы.", createdAt: NOW - 780 * D, system: true },
      { tld: "anct", desc: "Аргская Народная Цифровая Территория: службы общего пользования.", createdAt: NOW - 775 * D, system: true },
    ],
    domains: [
      { name: "login", tld: "arg", kind: "service", owner: "krol", desc: "Единый портал аутентификации (SSO) по IŦirinio.", port: 8000, hosted: true, system: true, createdAt: NOW - 770 * D },
      { name: "sb", tld: "arg", kind: "bank", owner: "statusbanko", desc: "StatusBanko — Государственный Банк: счета e-T и расчёты.", port: 8001, hosted: true, system: true, createdAt: NOW - 700 * D },
      { name: "gnicst", tld: "anct", kind: "reserved", owner: "arcanum", desc: "ГНИЦСТ (Kostosęrio dę Arcanum). Адрес выделен; служба размещается владельцем.", port: 8002, hosted: false, system: true, createdAt: NOW - 760 * D },
      { name: "post", tld: "arg", kind: "mail", owner: "krol", desc: "КЭП — единая почта Империи Аргия для граждан и ЮЛ.", port: 8003, hosted: true, system: true, createdAt: NOW - 750 * D },
      { name: "call", tld: "arg", kind: "voip", owner: "krol", desc: "ГИКС — государственная внутренняя телефония (WebRTC).", port: 8004, hosted: true, system: true, createdAt: NOW - 750 * D },
      { name: "kance", tld: "arg", kind: "admin", owner: "krol", desc: "Канцелярия Дворца Palacium Ręgnum: выдача паспортов, номеров, доменов и зон.", port: 8005, hosted: true, system: true, createdAt: NOW - 750 * D },
      { name: "kustos", tld: "arg", kind: "reserved", owner: "moder", desc: "Стража (Kustos). Адрес выделен; служба размещается владельцем.", port: 8006, hosted: false, system: true, createdAt: NOW - 740 * D },
      { name: "kustodia", tld: "arg", kind: "reserved", owner: "krol", desc: "Гвардия (Kustodia). Адрес выделен; служба размещается владельцем.", port: 8007, hosted: false, system: true, createdAt: NOW - 740 * D },
      { name: "ante", tld: "anct", kind: "reserved", owner: "krol", desc: "Армия (Tęrra-an / Cię-an). Адрес выделен; служба размещается владельцем.", port: 8008, hosted: false, system: true, createdAt: NOW - 740 * D },
      { name: "krg", tld: "arg", kind: "portal", owner: "krol", desc: "Универсальный портал Коллегий — входные врата ARG-NET.", port: 8009, hosted: true, system: true, createdAt: NOW - 770 * D },
      { name: "kollęgęn", tld: "arg", kind: "portal", owner: "krol", desc: "Зеркало портала Коллегий для резервирования.", port: 8010, hosted: true, system: true, mirror: true, createdAt: NOW - 760 * D },
    ],
    emails: [
      {
        id: "e1",
        from: "ivanov",
        to: "krol",
        subject: "Прошение о домене в зоне .arg",
        body: "Ваше Императорское Величество!\n\nПрошу выделить за моим именем домен ivanov.arg для ведения личного архива. Пошлину обязуюсь внести в StatusBanko в установленный срок.\n\nС верноподданнической преданностью,\nИванов А. П.\nIŦirinio 718442906513-229518074460",
        ts: NOW - 26 * H,
        read: false,
        folder: "in",
        trashed: false,
      },
      {
        id: "e2",
        from: "kollegia",
        to: "krol",
        subject: "Сводка: регистрация ЮЛ за седмицу",
        body: "Государь!\n\nДокладываю: за седмицу Коллегией зарегистрировано одно юридическое лицо, выдан номер ГиКС 23-00-10005-1. Нарушений Закона Toqorro при регистрации не выявлено.\n\nСекретарь Коллегии внутренних дел",
        ts: NOW - 2 * D,
        read: false,
        folder: "in",
        trashed: false,
      },
      {
        id: "e3",
        from: "krol",
        to: "ivanov",
        subject: "Указ №17 — о едином адресном пространстве",
        body: "ПОВЕЛЕВАЮ:\n\n1. Зону .arg утвердить за учреждениями государственными.\n2. Зону .anct — Аргскую Народную Цифровую Территорию — открыть для служб.\n3. Выделение доменов и новых доменных зон вести в Канцелярии Дворца.\n\nПодписано электронной печатью Империи.",
        ts: NOW - 3 * D,
        read: true,
        folder: "out",
        trashed: false,
      },
      {
        id: "e4",
        from: "krol",
        to: "ivanov",
        subject: "Указ №17 — о едином адресном пространстве",
        body: "ПОВЕЛЕВАЮ:\n\n1. Зону .arg утвердить за учреждениями государственными.\n2. Зону .anct — Аргскую Народную Цифровую Территорию — открыть для служб.\n3. Выделение доменов и новых доменных зон вести в Канцелярии Дворца.\n\nПодписано электронной печатью Империи.",
        ts: NOW - 3 * D,
        read: true,
        folder: "in",
        trashed: false,
      },
      {
        id: "e5",
        from: "statusbanko",
        to: "krol",
        subject: "Выписка по счёту Казны",
        body: "Направляем выписку по счёту Императорской Казны. Остаток на начало дня — 12 500,00 e-T. Поступления пошлин за доменные имена — 14,00 e-T.\n\nStatusBanko, операционный отдел",
        ts: NOW - 1 * D,
        read: false,
        folder: "in",
        trashed: false,
      },
    ],
    calls: [
      { id: "c1", from: "krol", to: "kollegia", ts: NOW - 5 * H, duration: 254, status: "ok" },
      { id: "c2", from: "ivanov", to: "krol", ts: NOW - 1 * D - 3 * H, duration: 61, status: "ok" },
      { id: "c3", from: "statusbanko", to: "krol", ts: NOW - 2 * D - 7 * H, duration: 0, status: "missed" },
    ],
    txs: [
      { id: "t1", from: "ivanov", to: "statusbanko", amount: 3, purpose: "Пошлина за доменное имя (зона .arg)", ts: NOW - 2 * D },
      { id: "t2", from: "statusbanko", to: "krol", amount: 1200, purpose: "Ежемесячное довольствие Гвардии", ts: NOW - 5 * D },
      { id: "t3", from: "krol", to: "arcanum", amount: 450, purpose: "Закупка машин для узла 07", ts: NOW - 9 * D },
    ],
    log: [
      { ts: NOW - 1 * H, text: "Плановая сверка Государственного реестра доменов" },
      { ts: NOW - 5 * H, text: "Вызов ГиКС: krol → kollegia (04:14)" },
      { ts: NOW - 26 * H, text: "ivanov: вход в сеть (узел 01, Йент)" },
      { ts: NOW - 2 * D, text: "Письмо: krol → ivanov («Указ №17…»)" },
      { ts: NOW - 3 * D, text: "StatusBanko: перевод 3,00 e-T от ivanov" },
      { ts: NOW - 120 * D, text: "Выдан паспорт 718442906513-229518074460 (ivanov)" },
    ],
  };
}

/* ---------- хранилище ---------- */

let cache: DB | null = null;
let version = 0;
const subs = new Set<() => void>();

export function subscribe(fn: () => void) {
  subs.add(fn);
  return () => {
    subs.delete(fn);
  };
}
export function getDB(): DB {
  if (!cache) cache = load();
  return cache;
}
function load(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DB;
      if (parsed && parsed.v === 2 && Array.isArray(parsed.users) && Array.isArray(parsed.zones)) return parsed;
    }
  } catch {
    /* повреждённые данные — пересоздаём */
  }
  const db = seed();
  persist(db);
  return db;
}
function persist(db: DB) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    /* квота */
  }
}
function mutate(fn: (db: DB) => void) {
  const db = getDB();
  fn(db);
  persist(db);
  version++;
  subs.forEach((f) => f());
}
export function useDB(): DB {
  useSyncExternalStore(subscribe, () => version);
  return getDB();
}
const uid = () => Math.random().toString(36).slice(2, 10);

/* ---------- сессия (на вкладку — свой вход) ---------- */

export function getSession(): User | null {
  const login = sessionStorage.getItem(SKEY);
  if (!login) return null;
  return getDB().users.find((u) => u.login === login) ?? null;
}
export function setSession(login: string | null) {
  if (login) sessionStorage.setItem(SKEY, login);
  else sessionStorage.removeItem(SKEY);
}

/* ---------- паспорта и номера ГиКС ---------- */

const itDigits = (s: string) => s.replace(/\D/g, "");
export function itirinioValid(s: string) {
  return /^\d{12}-\d{12}$/.test(s.trim());
}
export function itMatch(a: string, b: string) {
  return itDigits(a) === itDigits(b) && itDigits(a).length === 24;
}

function genItirinio(db: DB): string {
  for (let i = 0; i < 50; i++) {
    const p1 = String(Math.floor(100000000000 + Math.random() * 900000000000));
    const p2 = String(Math.floor(100000000000 + Math.random() * 900000000000));
    const it = `${p1}-${p2}`;
    if (!db.users.some((u) => u.itirinio === it)) return it;
  }
  return `${Date.now()}00-000000000000`;
}

/** Контрольная цифра ГиКС: сумма всех цифр номера без десятых частей. */
export function giksCheck(digits: string): number {
  const s = digits.replace(/\D/g, "").split("").reduce((a, c) => a + Number(c), 0);
  return s % 10;
}
export function checkGiks(g: string): boolean {
  const parts = g.split("-");
  const last = Number(parts[parts.length - 1]);
  return giksCheck(g.slice(0, g.lastIndexOf("-"))) === last;
}

function nextSeq(db: DB, prefix: string, width: number): string {
  let max = 0;
  for (const u of db.users) {
    if (u.giks.startsWith(prefix)) {
      const seg = u.giks.slice(prefix.length).split("-")[0];
      const n = parseInt(seg, 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  return String(max + 1).padStart(width, "0");
}

/** Номер ГиКС по паттерну сословия из реестра (Табель Kogoręx). */
export function genGiks(db: DB, role: Role, pref: string): string {
  const r = db.roles.find((x) => x.id === role) ?? db.roles.find((x) => x.id === "citizen");
  const prefix = r?.prefix ?? "17";
  const seq = r?.seq ?? 5;
  const base = r?.usePref
    ? `${prefix}-${pref}-${nextSeq(db, `${prefix}-${pref}-`, seq)}`
    : `${prefix}-${nextSeq(db, `${prefix}-`, seq)}`;
  return `${base}-${giksCheck(base)}`;
}

/** Перевыпуск номера ГиКС подданного по действующему паттерну его сословия. */
function reissueGiks(db: DB, u: User) {
  u.giks = genGiks(db, u.role, u.pref);
}
/** Перевыпуск номеров у всех держателей сословия (при смене паттерна). */
function reissueGiksAll(db: DB, roleId: Role) {
  db.users.filter((u) => u.role === roleId).forEach((u) => reissueGiks(db, u));
}

export function authUser(itirinio: string, password: string): { ok: true; user: User } | { ok: false; err: "notfound" | "blocked" | "badpass" } {
  const u = getDB().users.find((x) => itMatch(x.itirinio, itirinio));
  if (!u) return { ok: false, err: "notfound" };
  if (u.blocked) {
    addLog(`ОТКАЗ: вход по паспорту ${u.itirinio} (учётная запись заблокирована)`);
    return { ok: false, err: "blocked" };
  }
  if (u.password !== password) {
    addLog(`ОТКАЗ: неверный пароль по паспорту ${u.itirinio} (передано в ГНИЦСТ)`);
    return { ok: false, err: "badpass" };
  }
  addLog(`${u.login}: вход в сеть (узел 01, Йент)`);
  return { ok: true, user: u };
}

/* ---------- журнал ---------- */

export function addLog(text: string) {
  mutate((db) => {
    db.log.unshift({ ts: Date.now(), text });
    if (db.log.length > 100) db.log.length = 100;
  });
}

/* ---------- учётные записи ---------- */

export interface NewUser {
  name: string;
  role: Role;
  password: string;
  pref?: string;
}
export function createUser(d: NewUser): { err?: string; user?: User } {
  if (!d.name.trim()) return { err: "Укажите имя" };
  if (d.password.length < 6) return { err: "Пароль — не менее 6 знаков" };
  const db = getDB();
  const rd = db.roles.find((r) => r.id === d.role);
  if (!rd) return { err: "Сословие не числится в реестре" };
  const pref = rd.usePref ? d.pref ?? "00" : "00";
  const user: User = {
    login: d.name.trim().toLowerCase().replace(/[^a-zа-яё0-9]+/gi, "-").slice(0, 18) + "-" + uid().slice(0, 4),
    itirinio: genItirinio(db),
    name: d.name.trim(),
    password: d.password,
    role: d.role,
    giks: genGiks(db, d.role, pref),
    pref,
    blocked: false,
    createdAt: Date.now(),
  };
  mutate((x) => x.users.push(user));
  addLog(`Выдан паспорт ${user.itirinio} (${user.name}), номер ГиКС ${user.giks}`);
  return { user };
}

export function deleteUser(login: string): string | null {
  const db = getDB();
  const u = db.users.find((x) => x.login === login);
  if (!u) return "Не найдено";
  if (u.role === "root") return "Особа Императорского Дома неприкосновенна";
  mutate((d) => {
    d.users = d.users.filter((x) => x.login !== login);
  });
  addLog(`Аннулирован паспорт ${u.itirinio} (${login})`);
  return null;
}

export function setBlocked(login: string, blocked: boolean) {
  mutate((db) => {
    const u = db.users.find((x) => x.login === login);
    if (u) u.blocked = blocked;
  });
  addLog(`${blocked ? "Заблокирован" : "Разблокирован"}: ${login}`);
}

export function resetPassword(login: string): string {
  const pass = `arg-${Math.floor(100000 + Math.random() * 900000)}`;
  mutate((db) => {
    const u = db.users.find((x) => x.login === login);
    if (u) u.password = pass;
  });
  addLog(`Перевыпущен пароль: ${login}`);
  return pass;
}

/* ---------- ручное редактирование досье ---------- */

/** Приводит ввод к виду 000000000000-000000000000 (24 цифры). */
export function formatItirinio(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 24);
  return d.length > 12 ? `${d.slice(0, 12)}-${d.slice(12)}` : d;
}



export interface UserPatch {
  name?: string;
  itirinio?: string;
  role?: Role;
  pref?: string;
}

/** Правка досье подданного: имя, паспорт, сословие, префектура. ГиКС перевыпускается при смене сословия/префектуры. */
export function updateUser(login: string, patch: UserPatch): string | null {
  const db = getDB();
  const u = db.users.find((x) => x.login === login);
  if (!u) return "Подданный не найден в реестре";

  if (patch.name !== undefined && !patch.name.trim()) return "Имя не может быть пустым";

  let it = u.itirinio;
  if (patch.itirinio !== undefined) {
    it = formatItirinio(patch.itirinio);
    if (!itirinioValid(it)) return "IŦirinio: ровно 24 цифры (12-12)";
    if (db.users.some((x) => x.login !== login && x.itirinio === it))
      return "Такой IŦirinio уже числится в реестре";
  }

  const role = patch.role ?? u.role;
  if (u.role === "root" && role !== "root") return "Сословие Императорского Дома изменению не подлежит";
  const rd = db.roles.find((r) => r.id === role);
  if (!rd) return "Сословие не числится в реестре";
  const pref = rd.usePref ? patch.pref ?? u.pref : "00";

  const statusChanged = role !== u.role || (rd.usePref && pref !== u.pref);

  mutate((d) => {
    const t = d.users.find((x) => x.login === login);
    if (!t) return;
    if (patch.name !== undefined) t.name = patch.name.trim();
    t.itirinio = it;
    t.role = role;
    t.pref = pref;
    if (statusChanged) t.giks = genGiks(d, role, pref);
  });

  addLog(`Досье изменено: ${login}${statusChanged ? " (перевыпущен ГиКС)" : ""}`);
  return null;
}

/** Ручная установка пароля подданному. */
export function setPasswordManual(login: string, password: string): string | null {
  if (password.length < 6) return "Пароль — не менее 6 знаков";
  mutate((db) => {
    const u = db.users.find((x) => x.login === login);
    if (u) u.password = password;
  });
  addLog(`Вручную установлен пароль: ${login}`);
  return null;
}

/* ---------- реестр сословий (ролей) ---------- */

export interface RolePatch {
  label?: string;
  prefix?: string;
  seq?: 3 | 5;
  usePref?: boolean;
  admin?: boolean;
  legal?: boolean;
}

const PREFIX_RE = /^\d{1,2}(-\d{1,2})?$/;

export function createRole(p: RolePatch): string | null {
  const label = (p.label ?? "").trim();
  const prefix = (p.prefix ?? "").trim();
  if (label.length < 2) return "Укажите наименование сословия";
  if (!PREFIX_RE.test(prefix)) return "Паттерн ГиКС: 1–2 цифры, напр. 24-05 или 31";
  if (!p.seq) return "Укажите разрядность";
  const db = getDB();
  if (db.roles.some((r) => r.label.toLowerCase() === label.toLowerCase()))
    return "Сословие с таким наименованием уже числится";
  const id =
    label
      .toLowerCase()
      .replace(/[^a-zа-яё0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 20) || `role-${uid().slice(0, 4)}`;
  const finalId = db.roles.some((r) => r.id === id) ? `${id}-${uid().slice(0, 3)}` : id;
  mutate((d) => {
    d.roles.push({
      id: finalId,
      label,
      prefix,
      seq: p.seq!,
      usePref: !!p.usePref,
      admin: !!p.admin,
      legal: !!p.legal,
    });
  });
  addLog(`Учреждено сословие «${label}» (ГиКС ${prefix}-…)`);
  return null;
}

export function updateRole(id: Role, patch: RolePatch): string | null {
  const db = getDB();
  const r = db.roles.find((x) => x.id === id);
  if (!r) return "Сословие не найдено в реестре";
  if (patch.label !== undefined) {
    const label = patch.label.trim();
    if (label.length < 2) return "Наименование не может быть пустым";
    if (db.roles.some((x) => x.id !== id && x.label.toLowerCase() === label.toLowerCase()))
      return "Сословие с таким наименованием уже числится";
  }
  if (patch.prefix !== undefined && !PREFIX_RE.test(patch.prefix.trim()))
    return "Паттерн ГиКС: 1–2 цифры, напр. 24-05 или 31";
  if (id === "root" && patch.admin === false) return "Верховный Администратор не может быть лишён мандата";

  const patternChanged =
    (patch.prefix !== undefined && patch.prefix.trim() !== r.prefix) ||
    (patch.seq !== undefined && patch.seq !== r.seq) ||
    (patch.usePref !== undefined && patch.usePref !== r.usePref);

  mutate((d) => {
    const t = d.roles.find((x) => x.id === id);
    if (!t) return;
    if (patch.label !== undefined) t.label = patch.label.trim();
    if (patch.prefix !== undefined) t.prefix = patch.prefix.trim();
    if (patch.seq !== undefined) t.seq = patch.seq;
    if (patch.usePref !== undefined) t.usePref = patch.usePref;
    if (patch.admin !== undefined) t.admin = patch.admin;
    if (patch.legal !== undefined) t.legal = patch.legal;
    if (patternChanged) reissueGiksAll(d, id);
  });

  addLog(
    `Сословие «${r.label}» изменено${patternChanged ? ` — номера ГиКС держателей перевыпущены по новому паттерну` : ""}`
  );
  return null;
}

export function deleteRole(id: Role): string | null {
  const db = getDB();
  const r = db.roles.find((x) => x.id === id);
  if (!r) return "Сословие не найдено";
  if (r.builtin) return "Учредительное сословие упразднению не подлежит";
  const holders = db.users.filter((u) => u.role === id).length;
  if (holders > 0) return `Сословие числится за ${holders} подд. — сначала переведите их в другое`;
  mutate((d) => {
    d.roles = d.roles.filter((x) => x.id !== id);
  });
  addLog(`Сословие «${r.label}» упразднено`);
  return null;
}

/* ---------- реестр префектур ---------- */

export function createPref(code: string, name: string): string | null {
  const c = code.trim();
  if (!/^\d{2}$/.test(c)) return "Код префектуры: ровно 2 цифры";
  if (!name.trim()) return "Укажите наименование";
  if (getDB().prefs.some((p) => p.code === c)) return `Код ${c} уже закреплён`;
  mutate((db) => {
    db.prefs.push({ code: c, name: name.trim() });
  });
  addLog(`Учреждена префектура ${c} — ${name.trim()}`);
  return null;
}

export function updatePref(oldCode: string, patch: { code?: string; name?: string }): string | null {
  const db = getDB();
  const p = db.prefs.find((x) => x.code === oldCode);
  if (!p) return "Префектура не найдена в реестре";
  if (patch.name !== undefined && !patch.name.trim()) return "Наименование не может быть пустым";
  let code = oldCode;
  if (patch.code !== undefined) {
    code = patch.code.trim();
    if (!/^\d{2}$/.test(code)) return "Код префектуры: ровно 2 цифры";
    if (db.prefs.some((x) => x.code === code && x.code !== oldCode)) return `Код ${code} уже закреплён`;
  }
  const codeChanged = code !== oldCode;
  mutate((d) => {
    const t = d.prefs.find((x) => x.code === oldCode);
    if (!t) return;
    t.code = code;
    if (patch.name !== undefined) t.name = patch.name.trim();
    if (codeChanged) {
      for (const u of d.users) {
        if (u.pref === oldCode) {
          u.pref = code;
          const rd = d.roles.find((r) => r.id === u.role);
          if (rd?.usePref) reissueGiks(d, u);
        }
      }
    }
  });
  addLog(
    `Префектура ${oldCode} изменена${codeChanged ? `: новый код ${code}, номера ГиКС жителей перевыпущены` : ""}`
  );
  return null;
}

export function deletePref(code: string): string | null {
  const db = getDB();
  const p = db.prefs.find((x) => x.code === code);
  if (!p) return "Префектура не найдена";
  if (p.builtin) return "Учредительная префектура упразднению не подлежит";
  const residents = db.users.filter((u) => u.pref === code).length;
  if (residents > 0) return `В префектуре числится ${residents} подд. — сначала переселите их`;
  mutate((d) => {
    d.prefs = d.prefs.filter((x) => x.code !== code);
  });
  addLog(`Префектура ${code} упразднена`);
  return null;
}

/* ---------- доменные зоны ---------- */

export function createZone(tld: string, desc: string): string | null {
  const t = tld.trim().toLowerCase().replace(/^\./, "");
  if (!/^[a-z][a-z0-9-]{1,11}$/.test(t)) return "Зона: 2–12 знаков, латиница, начинается с буквы";
  if (getDB().zones.some((z) => z.tld === t)) return `Зона .${t} уже существует`;
  mutate((db) => db.zones.push({ tld: t, desc: desc.trim() || "Доменная зона ARG-NET", createdAt: Date.now() }));
  addLog(`Выделена доменная зона .${t}`);
  return null;
}

export function deleteZone(tld: string): string | null {
  const db = getDB();
  const z = db.zones.find((x) => x.tld === tld);
  if (!z) return "Зона не найдена";
  if (z.system) return "Основополагающие зоны .arg и .anct защищены Указом №17";
  if (db.domains.some((d) => d.tld === tld)) return "В зоне числятся домены — сначала отзовите их";
  mutate((d) => {
    d.zones = d.zones.filter((x) => x.tld !== tld);
  });
  addLog(`Упразднена доменная зона .${tld}`);
  return null;
}

/* ---------- домены ---------- */

export function domainFull(d: Domain) {
  return `${d.name}.${d.tld}`;
}
export function findDomain(host: string): Domain | null {
  const h = host.trim().toLowerCase().replace(/\/.*$/, "");
  return getDB().domains.find((d) => domainFull(d) === h) ?? null;
}
export function resolveHost(input: string): string {
  let s = input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/\s+/g, "");
  if (!s) return "krg.arg";
  if (s.includes(".")) return s;
  const db = getDB();
  for (const z of db.zones) {
    if (db.domains.some((d) => domainFull(d) === `${s}.${z.tld}`)) return `${s}.${z.tld}`;
  }
  return `${s}.arg`;
}

export interface NewDomain {
  name: string;
  tld: string;
  port: number;
  owner: string;
  desc: string;
}
export function registerDomain(d: NewDomain): string | null {
  const name = d.name.trim().toLowerCase();
  if (!/^[a-z0-9-]{2,24}$/.test(name)) return "Имя: 2–24 знака — латиница, цифры, «-»";
  const db = getDB();
  if (!db.zones.some((z) => z.tld === d.tld)) return `Доменная зона .${d.tld} не выделена`;
  if (db.domains.some((x) => x.name === name && x.tld === d.tld)) return `Домен ${name}.${d.tld} уже выделен`;
  if (d.port < 1024 || d.port > 65535) return "Порт: от 1024 до 65535";
  if (db.domains.some((x) => x.port === d.port)) return `Порт ${d.port} уже закреплён за другим узлом`;
  mutate((x) =>
    x.domains.push({
      name,
      tld: d.tld,
      kind: "reserved",
      owner: d.owner,
      desc: d.desc.trim() || "Адрес выделен Канцелярией",
      port: d.port,
      hosted: false,
      createdAt: Date.now(),
    })
  );
  addLog(`Выделен домен ${name}.${d.tld} (порт ${d.port})`);
  return null;
}

export function deleteDomain(host: string): string | null {
  const d = findDomain(host);
  if (!d) return "Домен не найден";
  if (d.system) return "Системный домен защищён Указом №17";
  mutate((db) => {
    db.domains = db.domains.filter((x) => domainFull(x) !== domainFull(d));
  });
  addLog(`Отозван домен ${domainFull(d)}`);
  return null;
}

/* ---------- почта (КЭП) ---------- */

export function sendMail(from: string, to: string, subject: string, body: string) {
  const ts = Date.now();
  const subj = subject.trim() || "(без темы)";
  mutate((db) => {
    db.emails.push({ id: "i" + uid(), from, to, subject: subj, body, ts, read: false, folder: "in", trashed: false });
    db.emails.push({ id: "o" + uid(), from, to, subject: subj, body, ts, read: true, folder: "out", trashed: false });
  });
  addLog(`Письмо: ${from} → ${to} («${subj.slice(0, 22)}${subj.length > 22 ? "…" : ""}»)`);
}
export function mailFor(login: string, folder: "in" | "out" | "trash"): EmailMsg[] {
  const db = getDB();
  return db.emails
    .filter((m) => {
      if (folder === "trash") return m.trashed && (m.to === login || m.from === login);
      if (folder === "in") return m.to === login && m.folder === "in" && !m.trashed;
      return m.from === login && m.folder === "out" && !m.trashed;
    })
    .sort((a, b) => b.ts - a.ts);
}
export function markRead(id: string) {
  mutate((db) => {
    const m = db.emails.find((x) => x.id === id);
    if (m && !m.read) m.read = true;
  });
}
export function setTrashed(id: string, trashed: boolean) {
  mutate((db) => {
    const m = db.emails.find((x) => x.id === id);
    if (m) m.trashed = trashed;
  });
}
export function purgeMail(id: string) {
  mutate((db) => {
    db.emails = db.emails.filter((x) => x.id !== id);
  });
}
export function unreadCount(login: string): number {
  return getDB().emails.filter((m) => m.to === login && m.folder === "in" && !m.read && !m.trashed).length;
}
export function userByItirinio(it: string): User | null {
  return getDB().users.find((u) => itMatch(u.itirinio, it)) ?? null;
}

/* ---------- ГИКС ---------- */

export function logCall(from: string, to: string, duration: number, status: CallRec["status"] = "ok") {
  mutate((db) => {
    db.calls.push({ id: uid(), from, to, ts: Date.now(), duration, status });
  });
  if (status === "ok") addLog(`Вызов ГиКС: ${from} → ${to} (${fmtDur(duration)})`);
  else addLog(`Вызов ГиКС: ${from} → ${to} — ${status === "missed" ? "пропущен" : status === "declined" ? "отклонён" : "без ответа"}`);
}
export function callsFor(login: string): CallRec[] {
  return getDB()
    .calls.filter((c) => c.from === login || c.to === login)
    .sort((a, b) => b.ts - a.ts);
}

/* ---------- банк ---------- */

export function balanceOf(login: string): number {
  const db = getDB();
  const base = db.users.find((u) => u.role === "legal")?.login === login ? 150000 : 240;
  let b = base;
  for (const t of db.txs) {
    if (t.to === login) b += t.amount;
    if (t.from === login) b -= t.amount;
  }
  return b;
}
export function transfer(from: string, to: string, amount: number, purpose: string): string | null {
  if (amount <= 0) return "Сумма должна быть положительной";
  if (balanceOf(from) < amount) return "Недостаточно средств на счёте";
  if (from === to) return "Перевод самому себе запрещён Уложением";
  mutate((db) => db.txs.push({ id: uid(), from, to, amount, purpose: purpose.trim() || "Платёж", ts: Date.now() }));
  addLog(`StatusBanko: перевод ${amount.toLocaleString("ru-RU")} e-T: ${from} → ${to}`);
  return null;
}
export function txsFor(login: string): Tx[] {
  return getDB()
    .txs.filter((t) => t.from === login || t.to === login)
    .sort((a, b) => b.ts - a.ts);
}

/* ---------- разное ---------- */

export function userName(login: string): string {
  return getDB().users.find((u) => u.login === login)?.name ?? login;
}
export function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}
export function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}
export function fmtDT(ts: number) {
  return `${fmtDate(ts)}, ${fmtTime(ts)}`;
}
export function fmtDur(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
export function phoneDigits(p: string) {
  return p.replace(/\D/g, "");
}

/* ---------- тосты ---------- */

export interface ToastMsg {
  id: number;
  text: string;
  kind: "ok" | "err" | "info";
}
let tid = 0;
const tsubs = new Set<(t: ToastMsg) => void>();
export function onToast(fn: (t: ToastMsg) => void) {
  tsubs.add(fn);
  return () => {
    tsubs.delete(fn);
  };
}
export function toast(text: string, kind: ToastMsg["kind"] = "ok") {
  const t: ToastMsg = { id: ++tid, text, kind };
  tsubs.forEach((f) => f(t));
}
