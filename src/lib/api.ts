/// <reference types="vite/client" />
/* ============================================================
   API-слой ЕГИКС ARG-NET.
   USE_REMOTE = false: все операции идут в локальный реестр (db.ts).
   USE_REMOTE = true:  операции переключаются на Django REST API
   Канцелярии (kance.arg). Контракт эндпоинтов — ENDPOINTS.
   ============================================================ */

export const USE_REMOTE = false;
export const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined) ?? "https://kance.arg/api";

export interface Endpoint {
  m: "GET" | "POST" | "PATCH" | "DELETE";
  p: string;
  d: string;
}

export const API_ENDPOINTS: Endpoint[] = [
  { m: "POST", p: "/auth/login/", d: "Вход по IŦirinio и паролю (login.arg, порт 8000)" },
  { m: "POST", p: "/auth/logout/", d: "Разрыв сеанса" },
  { m: "GET", p: "/registry/passports/", d: "Реестр выданных IŦirinio (root)" },
  { m: "POST", p: "/registry/passports/", d: "Выдача паспорта, роли и номера ГиКС (root)" },
  { m: "PATCH", p: "/registry/passports/<id>/", d: "Блокировка / перевыпуск пароля" },
  { m: "GET", p: "/registry/zones/", d: "Список доменных зон (.arg, .anct, …)" },
  { m: "POST", p: "/registry/zones/", d: "Выделение новой доменной зоны (root)" },
  { m: "DELETE", p: "/registry/zones/<tld>/", d: "Упразднение зоны без доменов (root)" },
  { m: "GET", p: "/registry/domains/", d: "Государственный реестр доменов" },
  { m: "POST", p: "/registry/domains/", d: "Выделение домена с портом (root)" },
  { m: "DELETE", p: "/registry/domains/<host>/", d: "Отзыв домена (root)" },
  { m: "GET", p: "/giks/online/", d: "Присутствие абонентов ГИКС (короткий поллинг)" },
  { m: "POST", p: "/giks/signal/", d: "Сигнализация WebRTC: offer/answer/ICE (call.arg)" },
  { m: "POST", p: "/giks/log/", d: "Запись вызова в журнал ГИКС" },
  { m: "GET", p: "/mail/inbox/", d: "Входящие письма КЭП (post.arg)" },
  { m: "POST", p: "/mail/send/", d: "Отправка письма" },
  { m: "GET", p: "/bank/accounts/", d: "Счета клиента (StatusBanko, sb.arg:8001)" },
  { m: "POST", p: "/bank/accounts/open/", d: "Заявление на счёт (лимит — 2 на рассмотрении)" },
  { m: "POST", p: "/bank/transfer/", d: "Перевод по номеру кошелька, без налога (конверсия через основную валюту)" },
  { m: "POST", p: "/bank/pay/", d: "Оплата по QR у юрлица — тип PAY, с налогом по правилу" },
  { m: "GET", p: "/bank/rates/", d: "Курсы валют к основной (ATO)" },
  { m: "GET", p: "/bank/tax-rules/", d: "Налоговые правила операций" },
  { m: "PATCH", p: "/bank/tax-rules/<type>/", d: "Ставка % и счёт-получатель налога (root)" },
  { m: "POST", p: "/bank/accounts/<id>/approve/", d: "Утверждение/отклонение заявления (управляющий)" },
  { m: "POST", p: "/bank/accounts/government/", d: "Государственный счёт (Корона / ЮЛ банка)" },
  { m: "GET", p: "/audit/log/", d: "Журнал аудита (root, tech)" },
];

/** Точка расширения: при USE_REMOTE сюда добавляются fetch-обёртки над ENDPOINTS. */
export const API = {
  base: API_BASE,
  endpoints: API_ENDPOINTS,
  remote: USE_REMOTE,
};
