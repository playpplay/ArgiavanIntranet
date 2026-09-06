import { useSyncExternalStore } from "react";

/* ============================================================
   ARG-Net • ЕГИКС — локальное хранилище прототипа.
   В боевом контуре заменяется на Django REST API (см. api.ts).
   ============================================================ */

export type Role = "root" | "tech" | "moderator" | "operator" | "user";
export type UserKind = "citizen" | "legal";
export type Tld = "arg" | "anct";
export type SiteKind =
  | "portal"
  | "mail"
  | "voip"
  | "bank"
  | "admin"
  | "monitor"
  | "agency"
  | "service"
  | "stub";

export const ROLE_LABEL: Record<Role, string> = {
  root: "Верховный Администратор",
  tech: "Технический специалист",
  moderator: "Модератор",
  operator: "Оператор Коллегии",
  user: "Ťivitano",
};

export const PREFECTURES: Array<{ code: string; name: string }> = [
  { code: "00", name: "Столица Йент (Ient)" },
  { code: "01", name: "Префектура Наго (Nago, пров. Тоно)" },
  { code: "02", name: "Префектура Накио (Nakio, пров. Тоно)" },
  { code: "03", name: "Префектура Ярикава (Yarikawa, пров. Мино)" },
  { code: "04", name: "Префектура Кагиото (Kagioto, пров. Мино)" },
  { code: "05", name: "Префектура Канаканэ (Kanakane, пров. Мино)" },
  { code: "06", name: "Провинция Катэ (Kate)" },
  { code: "99", name: "Служебные коды" },
];

export const GIKS_PREFIX: Record<string, string> = {
  "12": "Государственные органы",
  "17": "Граждане (Ťivitano)",
  "23": "Юридические лица",
  "24": "Силовые структуры",
  "99": "Технические",
};

export interface User {
  login: string;
  itirinio: string;
  name: string;
  password: string;
  role: Role;
  kind: UserKind;
  giks: string;
  pref: string;
  balance: number;
  blocked: boolean;
  createdAt: number;
}

export interface Domain {
  name: string;
  tld: Tld;
  kind: SiteKind;
  owner: string;
  desc: string;
  port: number;
  agency?: "kustos" | "kustodia" | "ante";
  mirror?: boolean;
  system?: boolean;
  createdAt: number;
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
  status: "ok" | "missed" | "declined";
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
export interface Complaint {
  id: string;
  from: string;
  subject: string;
  text: string;
  ts: number;
  status: "open" | "resolved" | "dismissed";
}
export interface Tx {
  id: string;
  from: string;
  to: string;
  amount: number;
  note: string;
  ts: number;
}
export interface DB {
  v: number;
  users: User[];
  domains: Domain[];
  emails: EmailMsg[];
  calls: CallRec[];
  log: LogEntry[];
  news: NewsItem[];
  complaints: Complaint[];
  tx: Tx[];
}

export const KIND_LABEL: Record<SiteKind, string> = {
  portal: "Портал Коллегий",
  mail: "КЭП — почта",
  voip: "ГИКС — телефония",
  bank: "StatusBanko",
  admin: "Канцелярия Дворца",
  monitor: "ГНИЦСТ — мониторинг",
  agency: "Ведомственный узел",
  service: "Служебный узел",
  stub: "Резерв",
};
export const KIND_LETTER: Record<SiteKind, string> = {
  portal: "К",
  mail: "П",
  voip: "Г",
  bank: "Б",
  admin: "Д",
  monitor: "Ц",
  agency: "В",
  service: "С",
  stub: "Р",
};

export const LEGAL_SHORT =
  "Собственность Аргской Империи • Ст. 123 ROTTO • КГТ Ст. 1 (187): трафик анализируется ГНИЦСТ";

export const LEGAL_FULL = [
  "Настоящая информационная сеть является собственностью Аргской Империи.",
  "В соответствии со Статьёй 123 ROTTO любое лицо, находящееся в цифровом или физическом периметре АИ, обязано соблюдать законы Империи.",
  "В соответствии со Статьёй 1 (187) КГТ все действия, транзакции e-T, почтовые отправления и журналы вызовов ГИКС автоматически анализируются алгоритмами ГНИЦСТ на предмет соответствия Закону Toqorro.",
  "Право на неприкосновенность переписки (Ст. 13.1 (22) Toqorro) может быть ограничено по решению Военного или Государственного трибунала в интересах безопасности Корона.",
  "Использование сети для распространения КГТ, критики монархического строя или организации несанкционированных собраний влечёт уголовную ответственность по Ст. 2 (66) и Ст. 3 (67) УК АИ.",
];

/* ---------------- хранилище ---------------- */

const KEY = "argnet-db-v2";
const SKEY = "argnet-session-v2";
const H = 3_600_000;
const D = 24 * H;
const NOW = Date.now();
export const NET_EPOCH = NOW - 263 * D;

export function giksCheck(digits: string): number {
  const sum = digits.replace(/\D/g, "").split("").reduce((a, c) => a + Number(c), 0);
  return sum % 10;
}

function seed(): DB {
  return {
    v: 2,
    users: [
      {
        login: "krol",
        itirinio: "A-000-001",
        name: "Аргольд IV, Император Аргии",
        password: "arg-root",
        role: "root",
        kind: "citizen",
        giks: "12-001",
        pref: "00",
        balance: 250000,
        blocked: false,
        createdAt: NOW - 263 * D,
      },
      {
        login: "vega",
        itirinio: "A-000-010",
        name: "Вегас Т.Н.",
        password: "arg-tech",
        role: "tech",
        kind: "citizen",
        giks: "12-010",
        pref: "00",
        balance: 4200,
        blocked: false,
        createdAt: NOW - 240 * D,
      },
      {
        login: "morag",
        itirinio: "A-000-017",
        name: "Мораг К.С.",
        password: "arg-mod",
        role: "moderator",
        kind: "citizen",
        giks: "24-01-007",
        pref: "00",
        balance: 3100,
        blocked: false,
        createdAt: NOW - 210 * D,
      },
      {
        login: "kolleg",
        itirinio: "A-000-021",
        name: "Операт К.Л.",
        password: "arg-op",
        role: "operator",
        kind: "citizen",
        giks: "12-021",
        pref: "00",
        balance: 2750,
        blocked: false,
        createdAt: NOW - 180 * D,
      },
      {
        login: "ivanov",
        itirinio: "A-001-291",
        name: "Иванов П.А.",
        password: "arg-1234",
        role: "user",
        kind: "citizen",
        giks: "17-00-45291-9",
        pref: "00",
        balance: 1180,
        blocked: false,
        createdAt: NOW - 90 * D,
      },
      {
        login: "nakamura",
        itirinio: "A-003-107",
        name: "Накамура Р.Т.",
        password: "arg-1234",
        role: "user",
        kind: "citizen",
        giks: "17-03-10774-5",
        pref: "03",
        balance: 640,
        blocked: false,
        createdAt: NOW - 41 * D,
      },
      {
        login: "torgdom",
        itirinio: "A-010-005",
        name: "Торговый дом «Наго»",
        password: "arg-1234",
        role: "user",
        kind: "legal",
        giks: "23-01-10005-3",
        pref: "01",
        balance: 18400,
        blocked: false,
        createdAt: NOW - 30 * D,
      },
    ],
    domains: [
      { name: "login", tld: "arg", kind: "service", owner: "krol", desc: "Единый портал аутентификации (SSO) по Iŧirinio.", port: 8000, system: true, createdAt: NOW - 263 * D },
      { name: "sb", tld: "arg", kind: "bank", owner: "krol", desc: "StatusBanko — Государственный Банк: счета и транзакции e-T.", port: 8001, system: true, createdAt: NOW - 260 * D },
      { name: "gnicst", tld: "anct", kind: "monitor", owner: "krol", desc: "ГНИЦСТ (Kostosęrio dę Arcanum): спец. связь и мониторинг. Закрытый контур.", port: 8002, system: true, createdAt: NOW - 258 * D },
      { name: "post", tld: "arg", kind: "mail", owner: "krol", desc: "КЭП — Императорская электронная почта для граждан и ЮЛ (аббревиатура сохранена Манифестом).", port: 8003, system: true, createdAt: NOW - 255 * D },
      { name: "call", tld: "arg", kind: "voip", owner: "krol", desc: "ГИКС — государственная внутренняя телефония (WebRTC).", port: 8004, system: true, createdAt: NOW - 252 * D },
      { name: "kance", tld: "arg", kind: "admin", owner: "krol", desc: "Канцелярия Дворца Palacium Ręgnum: администрирование ЕГИКС.", port: 8005, system: true, createdAt: NOW - 250 * D },
      { name: "kustos", tld: "arg", kind: "agency", agency: "kustos", owner: "krol", desc: "Стража (Kustos): правопорядок, жалобы, модерация.", port: 8006, system: true, createdAt: NOW - 245 * D },
      { name: "kustodia", tld: "arg", kind: "agency", agency: "kustodia", owner: "krol", desc: "Гвардия (Kustodia): охрана Дворца. Режимный объект.", port: 8007, system: true, createdAt: NOW - 245 * D },
      { name: "ante", tld: "anct", kind: "agency", agency: "ante", owner: "krol", desc: "Армия (Tęrra-an / Cię-an): военный контур.", port: 8008, system: true, createdAt: NOW - 244 * D },
      { name: "krg", tld: "arg", kind: "portal", owner: "krol", desc: "Универсальный портал Коллегий: реестр, вести, сводка сети.", port: 8009, system: true, createdAt: NOW - 240 * D },
      { name: "kollęgęn", tld: "arg", kind: "portal", owner: "krol", desc: "Альтернативный домен Коллегий (зеркало krg.arg).", port: 8010, mirror: true, system: true, createdAt: NOW - 240 * D },
    ],
    emails: [
      {
        id: "e1",
        from: "morag",
        to: "krol",
        subject: "Рапорт: признаки нарушения ст. 2 (66) УК АК",
        body: "Ваше Величество!\n\nДовожу до сведения: на форуме krg.arg зафиксирована публикация, содержащая признаки критики монархического строя. Автор установлен по Iŧirinio, учётная запись заблокирована в порядке ст. 3 (67) УК АК.\n\nМатериалы переданы в ГНИЦСТ для анализа по КГТ Ст. 1 (187).\n\nМораг К.С., модератор Стражи\nГиКС 24-01-007",
        ts: NOW - 20 * H,
        read: false,
        folder: "in",
        trashed: false,
      },
      {
        id: "e2",
        from: "vega",
        to: "krol",
        subject: "Отчёт ГНИЦСТ: плановый анализ трафика ЕГИКС",
        body: "Государь!\n\nЗа отчётную седмицу алгоритмами ГНИЦСТ обработано: 1 214 почтовых отправлений КЭП, 342 вызова ГИКС, 96 транзакций e-T. Отклонений от Закона Toqorro не выявлено.\n\nУзел gnicst.anct несёт службу в штатном режиме, задержка до столицы — 11 мс.\n\nВегас Т.Н., тех. специалист\nГиКС 12-010",
        ts: NOW - 2 * D,
        read: false,
        folder: "in",
        trashed: false,
      },
      {
        id: "e3",
        from: "ivanov",
        to: "krol",
        subject: "Прошение о регистрации ЮЛ (префикс 23)",
        body: "Ваше Величество!\n\nПрошу зарегистрировать юридическое лицо «Мастерская Иванова» с присвоением номера ГИКС префикса 23 по префектуре 00 (Столица Йент). Устав и квитанция об уплате пошлины e-T прилагаются.\n\nС верноподданнической преданностью,\nИванов П.А.\nIŧirinio A-001-291",
        ts: NOW - 3 * D,
        read: false,
        folder: "in",
        trashed: false,
      },
      {
        id: "e4",
        from: "krol",
        to: "ivanov",
        subject: "О порядке присвоения номеров префикса 23",
        body: "Милостивый государь!\n\nРегистрация ЮЛ ведётся Оператором Коллегии через Канцелярию (kance.arg). По рассмотрении прошения Вам будет присвоен номер вида 23-00-XXXXX-C, где C — контрольная цифра по Табели Kogoręx.\n\nПошлина списывается StatusBanko автоматически.\n\nКанцелярия Дворца Palacium Ręgnum",
        ts: NOW - 3 * D - 5 * H,
        read: true,
        folder: "out",
        trashed: false,
      },
      {
        id: "e5",
        from: "torgdom",
        to: "ivanov",
        subject: "Счёт за партию креплений для узла 04",
        body: "Господин Иванов!\n\nНаправляем счёт на 240 e-T за партию кабельных креплений, отгруженную для узла 04 (Префектура Кагиото). Оплата через StatusBanko (sb.arg), назначение: «Счёт 17/К».\n\nТорговый дом «Наго»\nГиКС 23-01-10005-3",
        ts: NOW - 26 * H,
        read: false,
        folder: "in",
        trashed: false,
      },
      {
        id: "e6",
        from: "krol",
        to: "vega",
        subject: "Повеление: подготовить узел к учениям",
        body: "ПОВЕЛЕВАЮ:\n\n1. Подготовить gnicst.anct к плановым учениям по резервированию.\n2. Проверить перезапуск служб портов 8000–8010.\n3. Доклад представить через КЭП к полнолунию.\n\nАргольд IV",
        ts: NOW - 6 * D,
        read: true,
        folder: "out",
        trashed: false,
      },
    ],
    calls: [
      { id: "c1", from: "krol", to: "vega", ts: NOW - 5 * H, duration: 254, status: "ok" },
      { id: "c2", from: "ivanov", to: "krol", ts: NOW - 1 * D - 3 * H, duration: 61, status: "ok" },
      { id: "c3", from: "morag", to: "krol", ts: NOW - 2 * D - 7 * H, duration: 0, status: "missed" },
    ],
    log: [
      { ts: NOW - 1 * H, text: "Плановая сверка Государственного реестра Iŧirinio" },
      { ts: NOW - 5 * H, text: "ГИКС: krol → vega (04:14)" },
      { ts: NOW - 20 * H, text: "Стража: заблокирована учётная запись (ст. 3 (67) УК АК)" },
      { ts: NOW - 26 * H, text: "КЭП: torgdom → ivanov («Счёт за партию…»)" },
      { ts: NOW - 2 * D, text: "ГНИЦСТ: плановый анализ трафика завершён, отклонений нет" },
      { ts: NOW - 3 * D, text: "StatusBanko: транзакция e-T 240.00 (ivanov → torgdom)" },
    ],
    news: [
      {
        id: "n1",
        title: "Закон Toqorro вступил в полную силу на всей территории ЕГИКС",
        date: "вчера, 09:00",
        tag: "Закон",
        lead: "С полуночи алгоритмы ГНИЦСТ применяют положения Закона ко всем видам трафика: КЭП, ГИКС, транзакции e-T.",
        text: "В соответствии со Ст. 1 (187) КГТ анализу подлежат почтовые отправления, журналы вызовов и транзакции e-T. Коллегия о внутренних делах напоминает: незнание Закона Toqorro не освобождает от ответственности по Ст. 2 (66) и Ст. 3 (67) УК АК.",
      },
      {
        id: "n2",
        title: "ГИКС: введена номерная ёмкость по Табели о рангах Kogoręx",
        date: "2 дня назад",
        tag: "ГИКС",
        lead: "Номера строго отражают иерархию: 12 — гос. органы, 17 — граждане, 23 — ЮЛ, 24 — силовые структуры, 99 — технические.",
        text: "Гражданские номера имеют вид 17-XX-XXXXX-C, где XX — код префектуры по Указу № 24, C — контрольная цифра. Выдача номеров ведётся исключительно через Канцелярию Дворца (kance.arg).",
      },
      {
        id: "n3",
        title: "StatusBanko ввёл мгновенные транзакции e-T между подданными",
        date: "3 дня назад",
        tag: "Банк",
        lead: "Переводы между счетами ЕГИКС исполняются за доли секунды; каждая операция фиксируется в реестре ГНИЦСТ.",
        text: "Государственный Банк (sb.arg) напоминает: назначение платежа обязательно. Транзакции без назначения трактуются как подозрительные и передаются в Стражу (kustos.arg).",
      },
      {
        id: "n4",
        title: "Указ № 24: утверждено административно-территориальное деление",
        date: "4 дня назад",
        tag: "Указ",
        lead: "Префектуры получили коды 00–06; провинция Катэ управляется напрямую Короной.",
        text: "Коды префектур применяются в номерах ГИКС граждан и ЮЛ. Столичный код 00 закреплён за Йентом (Ient). Служебный код 99 зарезервирован для линий ГНИЦСТ.",
      },
      {
        id: "n5",
        title: "ГНИЦСТ ввёл в строй узел gnicst.anct",
        date: "5 дней назад",
        tag: "Инфраструктура",
        lead: "Закрытый контур спец. связи и мониторинга доступен техническим специалистам и Верховному Администратору.",
        text: "Узел обеспечивает наблюдение за службами портов 8000–8010, журналами аудита и анализом трафика по КГТ. Доступ прочих подданных преследуется по ст. 14 (79) Закона Toqorro.",
      },
      {
        id: "n6",
        title: "Коллегия о внутренних делах: выдано 400 Iŧirinio за луну",
        date: "6 дней назад",
        tag: "Реестр",
        lead: "Темп выдачи идентификаторов вырос втрое после запуска единого портала login.arg.",
        text: "Каждый Iŧirinio уникален и пожизнен. Передача идентификатора третьим лицам приравнивается к передаче ключей от крепости и карается по Ст. 123 ROTTO.",
      },
    ],
    complaints: [
      {
        id: "q1",
        from: "ivanov",
        subject: "Навязчивые предложения на форуме krg.arg",
        text: "Пользователь с Iŧirinio A-007-331 рассыпает предложения «чудодейственных амулетов связи». Прошу принять меры по Закону Toqorro.",
        ts: NOW - 30 * H,
        status: "open",
      },
      {
        id: "q2",
        from: "torgdom",
        subject: "Оскорбление деловой репутации",
        text: "В разделе «Торговля» опубликованы заведомо ложные сведения о качестве креплений ТД «Наго». Просим установить автора и привлечь по ст. 2 (66) УК АК.",
        ts: NOW - 3 * D,
        status: "open",
      },
      {
        id: "q3",
        from: "nakamura",
        subject: "Попытка подбора пароля к ящику КЭП",
        text: "Зафиксировано 14 неудачных попыток входа в мой ящик с чужого Iŧirinio. Прошу проверить по журналам ГНИЦСТ.",
        ts: NOW - 6 * D,
        status: "resolved",
      },
    ],
    tx: [
      { id: "t1", from: "krol", to: "ivanov", amount: 300, note: "Жалование смотрителю узла 04", ts: NOW - 3 * D },
      { id: "t2", from: "ivanov", to: "torgdom", amount: 240, note: "Счёт 17/К, крепления", ts: NOW - 3 * D + 2 * H },
      { id: "t3", from: "torgdom", to: "krol", amount: 150, note: "Пошлина за номер 23-01-10005-3", ts: NOW - 30 * D },
    ],
  };
}

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
      if (parsed && parsed.v === 2 && Array.isArray(parsed.users)) return parsed;
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

/* ---------------- сессия и доступ ---------------- */

export function getSession(): User | null {
  const login = localStorage.getItem(SKEY);
  if (!login) return null;
  return getDB().users.find((u) => u.login === login) ?? null;
}
export function setSession(login: string | null) {
  if (login) localStorage.setItem(SKEY, login);
  else localStorage.removeItem(SKEY);
}

export type AuthResult =
  | { ok: true; user: User }
  | { ok: false; reason: "notfound" | "blocked" | "badpass" };

export function authUser(idInput: string, password: string): AuthResult {
  const id = idInput.trim().toLowerCase();
  const u = getDB().users.find((x) => x.itirinio.toLowerCase() === id || x.login === id);
  if (!u) {
    addLog(`Отказ доступа: Iŧirinio «${idInput.trim()}» не найден в реестре`);
    return { ok: false, reason: "notfound" };
  }
  if (u.blocked) {
    addLog(`Отказ доступа: ${u.login} — учётная запись заблокирована`);
    return { ok: false, reason: "blocked" };
  }
  if (u.password !== password) {
    addLog(`Отказ доступа: ${u.login} — неверный пароль`);
    return { ok: false, reason: "badpass" };
  }
  addLog(`${u.login}: вход в сеть (Iŧirinio ${u.itirinio})`);
  return { ok: true, user: u };
}

export function addLog(text: string) {
  mutate((db) => {
    db.log.unshift({ ts: Date.now(), text });
    if (db.log.length > 100) db.log.length = 100;
  });
}

/* ---------------- реестр Iŧirinio ---------------- */

function nextItirinio(db: DB): string {
  const nums = db.users.map((u) => parseInt(u.itirinio.replace(/\D/g, ""), 10)).filter((n) => !Number.isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `A-${String(max + 1).padStart(6, "0").slice(0, 3)}-${String(max + 1).padStart(6, "0").slice(3)}`;
}

export function genGiks(d: { role: Role; kind: UserKind; pref: string }): string {
  const serial5 = () => String(Math.floor(10000 + Math.random() * 89999));
  const serial3 = () => String(Math.floor(100 + Math.random() * 899));
  if (d.kind === "legal") {
    const s = serial5();
    return `23-${d.pref}-${s}-${giksCheck("23" + d.pref + s)}`;
  }
  if (d.role === "user") {
    const s = serial5();
    return `17-${d.pref}-${s}-${giksCheck("17" + d.pref + s)}`;
  }
  if (d.role === "moderator") return `24-01-${serial3()}`;
  if (d.role === "tech") return `12-0${serial3().slice(0, 2)}`;
  if (d.role === "operator") return `12-0${serial3().slice(0, 2)}`;
  return `99-${serial3()}`;
}

export interface NewUser {
  login: string;
  name: string;
  password: string;
  role: Role;
  kind: UserKind;
  pref: string;
  balance: number;
}

export function createUser(d: NewUser): { err?: string; user?: User } {
  const login = d.login.trim().toLowerCase();
  if (!/^[a-z0-9_-]{3,16}$/.test(login)) return { err: "Логин: 3–16 знаков — латиница, цифры, «-», «_»" };
  const db = getDB();
  if (db.users.some((u) => u.login === login)) return { err: "Такой логин уже числится в реестре" };
  if (!d.name.trim()) return { err: "Укажите фамилию и инициалы" };
  if (d.password.length < 6) return { err: "Пароль — не менее 6 знаков" };
  const user: User = {
    login,
    itirinio: nextItirinio(db),
    name: d.name.trim(),
    password: d.password,
    role: d.role,
    kind: d.kind,
    giks: genGiks(d),
    pref: d.pref,
    balance: d.balance,
    blocked: false,
    createdAt: Date.now(),
  };
  mutate((x) => x.users.push(user));
  addLog(`Выдан Iŧirinio ${user.itirinio} (${user.name}), ГиКС ${user.giks}`);
  return { user };
}

export function toggleBlock(login: string): string | null {
  if (login === "krol") return "Особа Короны неприкосновенна";
  mutate((db) => {
    const u = db.users.find((x) => x.login === login);
    if (u) {
      u.blocked = !u.blocked;
      addLog(`Учётная запись ${login} ${u.blocked ? "заблокирована" : "разблокирована"} (ст. 3 (67) УК АК)`);
    }
  });
  return null;
}

export function deleteUser(login: string): string | null {
  if (login === "krol") return "Особа Короны неприкосновенна";
  mutate((db) => {
    db.users = db.users.filter((u) => u.login !== login);
  });
  addLog(`Iŧirinio ${login} аннулирован в Государственном реестре`);
  return null;
}

export function resetPassword(login: string): string {
  const pass = `arg-${String(Math.floor(100000 + Math.random() * 899999))}`;
  mutate((db) => {
    const u = db.users.find((x) => x.login === login);
    if (u) u.password = pass;
  });
  addLog(`Аккаунту ${login} перевыпущен пароль`);
  return pass;
}

/* ---------------- домены ---------------- */

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
  if (db.domains.some((d) => domainFull(d) === `${s}.arg`)) return `${s}.arg`;
  if (db.domains.some((d) => domainFull(d) === `${s}.anct`)) return `${s}.anct`;
  return `${s}.arg`;
}
export function registerDomain(d: { name: string; tld: Tld; kind: SiteKind; owner: string; desc: string }): string | null {
  const name = d.name.trim().toLowerCase();
  if (!/^[a-z0-9ąćęłńóśźż-]{3,24}$/.test(name)) return "Имя: 3–24 знака (латиница, цифры, «-»)";
  if (getDB().domains.some((x) => x.name === name && x.tld === d.tld)) return `Домен ${name}.${d.tld} уже выделен`;
  const port = 8000 + getDB().domains.length;
  mutate((db) => {
    db.domains.push({ name, tld: d.tld, kind: d.kind, owner: d.owner, desc: d.desc.trim() || "Узел ARG-Net", port, system: false, createdAt: Date.now() });
  });
  addLog(`Выделен домен ${name}.${d.tld} (порт ${port})`);
  return null;
}
export function deleteDomain(host: string): string | null {
  const d = findDomain(host);
  if (!d) return "Домен не найден";
  if (d.system) return "Системный домен защищён повелением Короны";
  mutate((db) => {
    db.domains = db.domains.filter((x) => domainFull(x) !== domainFull(d));
  });
  addLog(`Домен ${domainFull(d)} исключён из реестра`);
  return null;
}

/* ---------------- КЭП ---------------- */

export function sendMail(from: string, to: string, subject: string, body: string) {
  const ts = Date.now();
  const subj = subject.trim() || "(без темы)";
  mutate((db) => {
    db.emails.push({ id: "i" + uid(), from, to, subject: subj, body, ts, read: false, folder: "in", trashed: false });
    db.emails.push({ id: "o" + uid(), from, to, subject: subj, body, ts, read: true, folder: "out", trashed: false });
  });
  addLog(`КЭП: ${from} → ${to} («${subj.slice(0, 22)}${subj.length > 22 ? "…" : ""}»)`);
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

/* ---------------- ГИКС ---------------- */

export function logCall(from: string, to: string, duration: number, status: CallRec["status"] = "ok") {
  mutate((db) => {
    db.calls.push({ id: uid(), from, to, ts: Date.now(), duration, status });
  });
  if (status === "ok" && duration > 0) addLog(`ГИКС: ${from} → ${to} (${fmtDur(duration)})`);
  else if (status === "missed") addLog(`ГИКС: пропущенный вызов ${from} → ${to}`);
  else if (status === "declined") addLog(`ГИКС: вызов ${from} → ${to} отклонён`);
}
export function callsFor(login: string): CallRec[] {
  return getDB()
    .calls.filter((c) => c.from === login || c.to === login)
    .sort((a, b) => b.ts - a.ts);
}

/* ---------------- StatusBanko ---------------- */

export function transfer(from: string, to: string, amount: number, note: string): string | null {
  const db = getDB();
  const src = db.users.find((u) => u.login === from);
  const dst = db.users.find((u) => u.login === to);
  if (!dst) return "Получатель не найден в реестре Iŧirinio";
  if (dst.login === from) return "Перевод самому себе запрещён регламентом StatusBanko";
  if (!amount || amount <= 0) return "Сумма должна быть положительной";
  if (!src || src.balance < amount) return "Недостаточно e-T на счёте";
  if (!note.trim()) return "Назначение платежа обязательно (регламент StatusBanko)";
  mutate((x) => {
    const a = x.users.find((u) => u.login === from)!;
    const b = x.users.find((u) => u.login === to)!;
    a.balance -= amount;
    b.balance += amount;
    x.tx.push({ id: uid(), from, to, amount, note: note.trim(), ts: Date.now() });
  });
  addLog(`StatusBanko: транзакция e-T ${amount.toFixed(2)} (${from} → ${to})`);
  return null;
}
export function txFor(login: string): Tx[] {
  return getDB()
    .tx.filter((t) => t.from === login || t.to === login)
    .sort((a, b) => b.ts - a.ts);
}

/* ---------------- Стража: жалобы ---------------- */

export function resolveComplaint(id: string, status: Complaint["status"]) {
  mutate((db) => {
    const c = db.complaints.find((x) => x.id === id);
    if (c) c.status = status;
  });
  addLog(`Стража: жалоба ${id.toUpperCase()} — ${status === "resolved" ? "удовлетворена" : "отклонена"}`);
}
export function addComplaint(from: string, subject: string, text: string) {
  mutate((db) => {
    db.complaints.push({ id: uid(), from, subject: subject.trim(), text: text.trim(), ts: Date.now(), status: "open" });
  });
  addLog(`Стража: принята жалоба от ${from} («${subject.trim().slice(0, 20)}»)`);
}

/* ---------------- разное ---------------- */

export function userByLogin(login: string): User | null {
  return getDB().users.find((u) => u.login === login) ?? null;
}
export function userName(login: string): string {
  return userByLogin(login)?.name ?? login;
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
export function prefName(code: string): string {
  return PREFECTURES.find((p) => p.code === code)?.name ?? code;
}

/* ---------------- тосты ---------------- */

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
