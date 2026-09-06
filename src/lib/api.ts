import {
  authUser,
  createUser,
  registerDomain,
  deleteDomain,
  sendMail,
  logCall,
  transfer,
  getDB,
  type AuthResult,
  type NewUser,
  type Tld,
  type SiteKind,
} from "./db";

/* ============================================================
   API-СЛОЙ ARG-Net / ЕГИКС

   Прототип работает на локальном хранилище (db.ts). При развёртывании
   боевого контура на PythonAnywhere (Django + DRF) достаточно включить
   USE_REMOTE — сигнатуры функций совпадают 1-в-1 с эндпоинтами ниже,
   а фронтенд (dist/) отдаётся тем же Django через StaticFiles/nginx.

   Схема боевого контура (согласно ТЗ, п. 2.1–2.2):
     dnsmasq (*.arg, *.anct → 127.0.0.1) → nginx (Host → порт)
       login.arg    :8000  SSO по Iŧirinio
       sb.arg       :8001  StatusBanko
       gnicst.anct  :8002  ГНИЦСТ
       post.arg     :8003  КЭП
       call.arg     :8004  ГИКС (WebRTC)
       kance.arg    :8005  Канцелярия
       ...
   ============================================================ */

export const API_BASE: string = (import.meta as { env?: Record<string, string> }).env?.VITE_API_BASE ?? "/api/v1";
/** Переключить на true после деплоя Django-бэкенда. */
export const USE_REMOTE = false;

export interface Endpoint {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  desc: string;
  access: string;
}

/** Карта эндпоинтов Django REST API боевого контура. */
export const ENDPOINTS: Endpoint[] = [
  { method: "POST", path: "/auth/login/", desc: "Аутентификация по Iŧirinio и паролю, выдача сессии", access: "все" },
  { method: "GET", path: "/auth/session/", desc: "Текущая сессия и полномочия", access: "все" },
  { method: "GET", path: "/registry/itirinio/", desc: "Государственный реестр Iŧirinio", access: "root, operator" },
  { method: "POST", path: "/registry/itirinio/", desc: "Выдача Iŧirinio и номера ГИКС по Табели Kogoręx", access: "root, operator" },
  { method: "PATCH", path: "/registry/itirinio/{login}/block/", desc: "Блокировка учётной записи (ст. 3 (67) УК АК)", access: "root, moderator" },
  { method: "GET", path: "/domains/", desc: "Реестр доменных зон .arg и .anct", access: "все" },
  { method: "POST", path: "/domains/", desc: "Выделение домена и порта новому Django-проекту", access: "root" },
  { method: "DELETE", path: "/domains/{host}/", desc: "Исключение домена из реестра", access: "root" },
  { method: "GET", path: "/kep/inbox/", desc: "Ящик КЭП (входящие депеши)", access: "владелец" },
  { method: "POST", path: "/kep/send/", desc: "Отправка депеши через КЭП", access: "все" },
  { method: "POST", path: "/giks/call/", desc: "Инициирование вызова ГИКС (WebRTC-сигналинг)", access: "все" },
  { method: "POST", path: "/giks/log/", desc: "Запись в журнал вызовов (архивация по КГТ)", access: "все" },
  { method: "POST", path: "/bank/transfer/", desc: "Транзакция e-T между счетами", access: "все" },
  { method: "GET", path: "/kustos/complaints/", desc: "Жалобы и нарушения Закона Toqorro", access: "root, moderator" },
  { method: "PATCH", path: "/kustos/complaints/{id}/", desc: "Решение по жалобе", access: "root, moderator" },
  { method: "GET", path: "/gnicst/services/", desc: "Состояние служб портов 8000–8010", access: "root, tech" },
  { method: "POST", path: "/gnicst/services/{port}/restart/", desc: "Перезапуск службы", access: "root, tech" },
  { method: "GET", path: "/audit/log/", desc: "Журнал аудита ЕГИКС", access: "root, tech" },
];

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    credentials: "include",
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return (await res.json()) as T;
}

/* Тонкие обёртки: при USE_REMOTE=true уходят в Django, иначе — в локальное хранилище. */

export const api = {
  login(id: string, password: string): Promise<AuthResult> {
    if (USE_REMOTE) return fetchJson("/auth/login/", { method: "POST", body: JSON.stringify({ id, password }) });
    return Promise.resolve(authUser(id, password));
  },
  async listDomains() {
    if (USE_REMOTE) return fetchJson("/domains/");
    return getDB().domains;
  },
  async createDomain(d: { name: string; tld: Tld; kind: SiteKind; owner: string; desc: string }) {
    if (USE_REMOTE) return fetchJson("/domains/", { method: "POST", body: JSON.stringify(d) });
    return registerDomain(d);
  },
  async removeDomain(host: string) {
    if (USE_REMOTE) return fetchJson(`/domains/${host}/`, { method: "DELETE" });
    return deleteDomain(host);
  },
  async createUser(d: NewUser) {
    if (USE_REMOTE) return fetchJson("/registry/itirinio/", { method: "POST", body: JSON.stringify(d) });
    return createUser(d);
  },
  async sendMail(from: string, to: string, subject: string, body: string) {
    if (USE_REMOTE) return fetchJson("/kep/send/", { method: "POST", body: JSON.stringify({ from, to, subject, body }) });
    sendMail(from, to, subject, body);
    return null;
  },
  async logGiksCall(from: string, to: string, duration: number, status: "ok" | "missed" | "declined") {
    if (USE_REMOTE) return fetchJson("/giks/log/", { method: "POST", body: JSON.stringify({ from, to, duration, status }) });
    logCall(from, to, duration, status);
    return null;
  },
  async transfer(from: string, to: string, amount: number, note: string) {
    if (USE_REMOTE) return fetchJson("/bank/transfer/", { method: "POST", body: JSON.stringify({ from, to, amount, note }) });
    return transfer(from, to, amount, note);
  },
};
