import { useSyncExternalStore } from "react";

export type Role = "admin" | "citizen";
export type Tld = "arg" | "anct";
export type SiteKind =
  | "portal"
  | "mail"
  | "voip"
  | "news"
  | "empire"
  | "registry"
  | "admin"
  | "stub";

export interface User {
  login: string;
  name: string;
  password: string;
  role: Role;
  phone: string;
  createdAt: number;
}
export interface Domain {
  name: string;
  tld: Tld;
  kind: SiteKind;
  owner: string;
  desc: string;
  createdAt: number;
  system?: boolean;
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
}
export interface LogEntry {
  ts: number;
  text: string;
}
export interface NewsItem {
  id: string;
  title: string;
  date: string;
  tag: string;
  lead: string;
  text: string;
}
export interface DB {
  v: number;
  users: User[];
  domains: Domain[];
  emails: EmailMsg[];
  calls: CallRec[];
  log: LogEntry[];
  news: NewsItem[];
}

export const KIND_LABEL: Record<SiteKind, string> = {
  portal: "Портал",
  mail: "Почта",
  voip: "VoIP-связь",
  news: "Вести",
  empire: "Гос. узел",
  registry: "Реестр",
  admin: "Канцелярия",
  stub: "Заглушка",
};

export const KIND_LETTER: Record<SiteKind, string> = {
  portal: "П",
  mail: "М",
  voip: "Т",
  news: "В",
  empire: "И",
  registry: "Р",
  admin: "К",
  stub: "З",
};

const KEY = "argonet-db-v1";
const SKEY = "argonet-session-v1";
const H = 3_600_000;
const D = 24 * H;
const NOW = Date.now();
export const NET_EPOCH = NOW - 412 * D;

function seed(): DB {
  return {
    v: 1,
    users: [
      {
        login: "imperator",
        name: "Е.И.В. Государь Император",
        password: "arg-0001",
        role: "admin",
        phone: "71-01",
        createdAt: NOW - 90 * D,
      },
      {
        login: "ivanov",
        name: "И. Иванов-Аргский",
        password: "arg-0002",
        role: "citizen",
        phone: "71-02",
        createdAt: NOW - 41 * D,
      },
      {
        login: "petrova",
        name: "М. Петрова-Оболенская",
        password: "arg-0003",
        role: "citizen",
        phone: "71-03",
        createdAt: NOW - 12 * D,
      },
    ],
    domains: [
      {
        name: "portal",
        tld: "arg",
        kind: "portal",
        owner: "imperator",
        desc: "Входные врата Аргонета: реестр узлов, указ дня, сводка сети.",
        createdAt: NOW - 412 * D,
        system: true,
      },
      {
        name: "pochta",
        tld: "anct",
        kind: "mail",
        owner: "imperator",
        desc: "Имперская почта — депеши между подданными сети.",
        createdAt: NOW - 410 * D,
        system: true,
      },
      {
        name: "zvonok",
        tld: "anct",
        kind: "voip",
        owner: "imperator",
        desc: "Аргфон — голосовая связь поверх каналов Аргонета.",
        createdAt: NOW - 405 * D,
        system: true,
      },
      {
        name: "imperiya",
        tld: "arg",
        kind: "empire",
        owner: "imperator",
        desc: "Официальный узел Империи: уложения, символы, указы.",
        createdAt: NOW - 400 * D,
        system: true,
      },
      {
        name: "vesti",
        tld: "anct",
        kind: "news",
        owner: "imperator",
        desc: "Аргтаграф — агентство имперских вестей.",
        createdAt: NOW - 380 * D,
        system: true,
      },
      {
        name: "registr",
        tld: "arg",
        kind: "registry",
        owner: "imperator",
        desc: "Имперский реестр доменов зон .arg и .anct.",
        createdAt: NOW - 380 * D,
        system: true,
      },
      {
        name: "upravlenie",
        tld: "arg",
        kind: "admin",
        owner: "imperator",
        desc: "Имперская канцелярия — управление сетью. Только администратор.",
        createdAt: NOW - 400 * D,
        system: true,
      },
      {
        name: "kazna",
        tld: "arg",
        kind: "stub",
        owner: "imperator",
        desc: "Имперская казна — учёт пошлин за домены.",
        createdAt: NOW - 3 * D,
      },
    ],
    emails: [
      {
        id: "e1",
        from: "petrova",
        to: "imperator",
        subject: "Прошение о домене в зоне .arg",
        body: "Ваше Императорское Величество!\n\nПрошу зарегистрировать за моим именем домен obolensk.arg для ведения родового архива. Клятву связиста прилагаю, пошлину готова внести в Имперскую казну.\n\nС верноподданнической преданностью,\nМ. Петрова-Оболенская\nподд. № А-71-03",
        ts: NOW - 26 * H,
        read: false,
        folder: "in",
        trashed: false,
      },
      {
        id: "e2",
        from: "ivanov",
        to: "imperator",
        subject: "Доклад: состояние линий узла 07",
        body: "Государь!\n\nДокладываю: узел 07 «Верхний Аргск» введён в строй. Задержка до столицы — 14 мс, резервная линия через Южный тракт проверена.\n\nЗамыканий и помех не наблюдается. Аргонет несёт службу исправно.\n\nИ. Иванов-Аргский,\nсмотритель узла 07",
        ts: NOW - 2 * D,
        read: false,
        folder: "in",
        trashed: false,
      },
      {
        id: "e3",
        from: "imperator",
        to: "ivanov",
        subject: "Указ №17 — о едином адресном пространстве",
        body: "ПОВЕЛЕВАЮ:\n\n1. Зону .arg утвердить за учреждениями государственными.\n2. Зону .anct — Аргскую Народную Цифровую Территорию — открыть для служб и подданных.\n3. Реестр доменов вести в Имперской канцелярии, самовольное захватничество имён пресекать.\n\nПодписано электронной печатью Империи.",
        ts: NOW - 3 * D,
        read: true,
        folder: "out",
        trashed: false,
      },
      {
        id: "e4",
        from: "imperator",
        to: "ivanov",
        subject: "Указ №17 — о едином адресном пространстве",
        body: "ПОВЕЛЕВАЮ:\n\n1. Зону .arg утвердить за учреждениями государственными.\n2. Зону .anct — Аргскую Народную Цифровую Территорию — открыть для служб и подданных.\n3. Реестр доменов вести в Имперской канцелярии, самовольное захватничество имён пресекать.\n\nПодписано электронной печатью Империи.",
        ts: NOW - 3 * D,
        read: true,
        folder: "in",
        trashed: false,
      },
      {
        id: "e5",
        from: "petrova",
        to: "ivanov",
        subject: "Схема резервного канала",
        body: "Иван, направляю схему резервирования Южного тракта. Обрати внимание на узел 04 — там слабое звено, просила Канцелярию поставить дублирующую машину.\n\nМ.",
        ts: NOW - 1 * D,
        read: false,
        folder: "in",
        trashed: false,
      },
      {
        id: "e6",
        from: "imperator",
        to: "petrova",
        subject: "Добро пожаловать в Аргонет",
        body: "Милостивая государыня!\n\nВаше подданство в Аргонете утверждено. Вверен Вам номер А-71-03 и ящик имперской почты.\n\nДа послужит сеть Империи и Вашему дому.\n\nКанцелярия связи",
        ts: NOW - 12 * D,
        read: true,
        folder: "out",
        trashed: false,
      },
    ],
    calls: [
      { id: "c1", from: "imperator", to: "ivanov", ts: NOW - 5 * H, duration: 254 },
      { id: "c2", from: "ivanov", to: "imperator", ts: NOW - 1 * D - 3 * H, duration: 61 },
      { id: "c3", from: "petrova", to: "imperator", ts: NOW - 2 * D - 7 * H, duration: 12 },
    ],
    log: [
      { ts: NOW - 1 * H, text: "Обновлён реестр доменов (плановая сверка)" },
      { ts: NOW - 5 * H, text: "Вызов: imperator → ivanov (04:14)" },
      { ts: NOW - 26 * H, text: "petrova: вход в сеть (узел 01)" },
      { ts: NOW - 2 * D, text: "Создан аккаунт petrova" },
      { ts: NOW - 3 * D, text: "Зарегистрирован домен kazna.arg" },
      { ts: NOW - 3 * D, text: "Депеша: imperator → ivanov («Указ №17…»)" },
    ],
    news: [
      {
        id: "n1",
        title: "Узел 07 «Верхний Аргск» введён в строй",
        date: "вчера, 21:14",
        tag: "Инфраструктура",
        lead: "Сеть Империи приросла двенадцатым узлом: задержка до столицы сократилась до 14 мс.",
        text: "Строительство велось три седмицы силами связистов Южного тракта. Узел оснащён дублирующими машинами и несёт дежурство в круглосуточном режиме. Смотрителем назначен И. Иванов-Аргский. По случаю пуска Канцелярия связи объявила недельную амнистию по штрафам за просроченные доменные пошлины.",
      },
      {
        id: "n2",
        title: "Указ №17: единое адресное пространство .arg и .anct",
        date: "3 дня назад",
        tag: "Указ",
        lead: "Государь утвердил разделение зон: .arg — учреждения Империи, .anct — Народная Цифровая Территория.",
        text: "Согласно указу, имена в зоне .arg жалуются учреждениям и должностным лицам, а зона .anct открыта для служб и подданных. Реестр ведёт Имперская канцелярия; самовольное захватничество имён карается отключением от сети на срок до одной луны.",
      },
      {
        id: "n3",
        title: "Аргфон держит качество связи на 99,2%",
        date: "4 дня назад",
        tag: "Связь",
        lead: "Итоги месяца голосовой службы: 214 вызовов, средняя длительность — 3 минуты 41 секунда.",
        text: "Инженеры Аргфонa списывают устойчивую работу на новый кодек АРГ-256 и дисциплину абонентов. Единственный сбой месяца произошёл по вине грозового фронта над Южным трактом и длился менее минуты.",
      },
      {
        id: "n4",
        title: "Почтовый трафик вырос втрое за седмицу",
        date: "5 дней назад",
        tag: "Почта",
        lead: "Подданные оценили имперскую почту: среднее время доставки депеши — менее секунды.",
        text: "Канцелярия напоминает: депеши, содержащие государственную тайну, надлежит помечать грифами по Уложению о тайне. За пересылку крамольных воззваний полагается отключение ящика без права восстановления.",
      },
      {
        id: "n5",
        title: "Учения связистов: резервирование канала отработано",
        date: "6 дней назад",
        tag: "Безопасность",
        lead: "По легенде учений столица лишилась основного тракта — сеть перестроилась за 40 секунд.",
        text: "В учениях участвовали все двенадцать узлов. Наблюдатели Канцелярии отметили слаженную работу смотрителей и условно-боевую тревогу в Аргфонe. Следующие учения намечены на полнолуние.",
      },
      {
        id: "n6",
        title: "Реестр пополнился: kazna.arg ушёл Имперской казне",
        date: "3 дня назад",
        tag: "Реестр",
        lead: "Первый домен новой седмицы зарегистрирован за Министерством финансов.",
        text: "На узле kazna.arg ведётся учёт пошлин за владение именами. Тарифы милостивы: один империал в год за имя в зоне .anct и три — в зоне .arg. Страница службы пока строится.",
      },
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
      if (parsed && Array.isArray(parsed.users)) return parsed;
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
    /* квота — не критично для прототипа */
  }
}

function mutate(fn: (db: DB) => void) {
  const db = getDB();
  fn(db);
  persist(db);
  version++;
  subs.forEach((f) => f());
}

/** Подписка React-компонентов на изменения базы. */
export function useDB(): DB {
  useSyncExternalStore(subscribe, () => version);
  return getDB();
}

const uid = () => Math.random().toString(36).slice(2, 10);

/* ---------- сессия ---------- */

export function getSession(): User | null {
  const login = localStorage.getItem(SKEY);
  if (!login) return null;
  return getDB().users.find((u) => u.login === login) ?? null;
}

export function setSession(login: string | null) {
  if (login) localStorage.setItem(SKEY, login);
  else localStorage.removeItem(SKEY);
}

export function authUser(login: string, password: string): User | null {
  const u = getDB().users.find((x) => x.login === login.trim().toLowerCase());
  if (!u || u.password !== password) return null;
  addLog(`${u.login}: вход в сеть (узел 01)`);
  return u;
}

/* ---------- журнал ---------- */

export function addLog(text: string) {
  mutate((db) => {
    db.log.unshift({ ts: Date.now(), text });
    if (db.log.length > 80) db.log.length = 80;
  });
}

/* ---------- подданные ---------- */

function nextPhone(db: DB): string {
  const nums = db.users
    .map((u) => parseInt(u.phone.replace(/\D/g, "").slice(2), 10))
    .filter((n) => !Number.isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `71-${String(max + 1).padStart(2, "0")}`;
}

export function createUser(d: { login: string; name: string; password: string; role: Role }): string | null {
  const login = d.login.trim().toLowerCase();
  if (!/^[a-z0-9_-]{3,16}$/.test(login)) return "Логин: 3–16 знаков — латиница, цифры, «-», «_»";
  if (getDB().users.some((u) => u.login === login)) return "Такой подданный уже числится в реестре";
  if (!d.name.trim()) return "Укажите имя подданного";
  if (d.password.length < 6) return "Пароль — не менее 6 знаков";
  mutate((db) => {
    db.users.push({
      login,
      name: d.name.trim(),
      password: d.password,
      role: d.role,
      phone: nextPhone(db),
      createdAt: Date.now(),
    });
  });
  addLog(`Создан аккаунт ${login}`);
  return null;
}

export function deleteUser(login: string): string | null {
  if (login === "imperator") return "Особа Императорского Дома неприкосновенна";
  mutate((db) => {
    db.users = db.users.filter((u) => u.login !== login);
  });
  addLog(`Аккаунт ${login} исключён из реестра`);
  return null;
}

export function resetPassword(login: string): string {
  const pass = `arg-${String(Math.floor(1000 + Math.random() * 9000))}`;
  mutate((db) => {
    const u = db.users.find((x) => x.login === login);
    if (u) u.password = pass;
  });
  addLog(`Аккаунту ${login} выдан новый пароль`);
  return pass;
}

/* ---------- домены ---------- */

export function domainFull(d: Domain) {
  return `${d.name}.${d.tld}`;
}

export function findDomain(host: string): Domain | null {
  const h = host.trim().toLowerCase().replace(/\/.*$/, "");
  return getDB().domains.find((d) => domainFull(d) === h) ?? null;
}

/** Превращает ввод из адресной строки в имя узла. */
export function resolveHost(input: string): string {
  let s = input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/\s+/g, "");
  if (!s) return "portal.arg";
  if (s.includes(".")) return s;
  const db = getDB();
  if (db.domains.some((d) => domainFull(d) === `${s}.arg`)) return `${s}.arg`;
  if (db.domains.some((d) => domainFull(d) === `${s}.anct`)) return `${s}.anct`;
  return `${s}.arg`;
}

export function registerDomain(d: {
  name: string;
  tld: Tld;
  kind: SiteKind;
  owner: string;
  desc: string;
}): string | null {
  const name = d.name.trim().toLowerCase();
  if (!/^[a-z0-9-]{3,24}$/.test(name)) return "Имя: 3–24 знака — латиница, цифры, «-»";
  if (getDB().domains.some((x) => x.name === name && x.tld === d.tld))
    return `Домен ${name}.${d.tld} уже жалован`;
  mutate((db) => {
    db.domains.push({
      name,
      tld: d.tld,
      kind: d.kind,
      owner: d.owner,
      desc: d.desc.trim() || "Служба Аргонета",
      createdAt: Date.now(),
    });
  });
  addLog(`Зарегистрирован домен ${name}.${d.tld}`);
  return null;
}

export function deleteDomain(host: string): string | null {
  const d = findDomain(host);
  if (!d) return "Домен не найден";
  if (d.system || d.kind === "admin") return "Системный домен защищён указом";
  mutate((db) => {
    db.domains = db.domains.filter((x) => domainFull(x) !== domainFull(d));
  });
  addLog(`Домен ${domainFull(d)} исключён из реестра`);
  return null;
}

/* ---------- почта ---------- */

export function sendMail(from: string, to: string, subject: string, body: string) {
  const ts = Date.now();
  const subj = subject.trim() || "(без темы)";
  mutate((db) => {
    db.emails.push({ id: "i" + uid(), from, to, subject: subj, body, ts, read: false, folder: "in", trashed: false });
    db.emails.push({ id: "o" + uid(), from, to, subject: subj, body, ts, read: true, folder: "out", trashed: false });
  });
  addLog(`Депеша: ${from} → ${to} («${subj.slice(0, 22)}${subj.length > 22 ? "…" : ""}»)`);
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

/* ---------- звонки ---------- */

export function logCall(from: string, to: string, duration: number) {
  if (duration <= 0) return;
  mutate((db) => {
    db.calls.push({ id: uid(), from, to, ts: Date.now(), duration });
  });
  addLog(`Вызов: ${from} → ${to} (${fmtDur(duration)})`);
}

export function callsFor(login: string): CallRec[] {
  return getDB()
    .calls.filter((c) => c.from === login || c.to === login)
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
