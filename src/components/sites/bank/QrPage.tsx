import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import jsQR from "jsqr";
import {
  useBank,
  accountsForUser,
  accountById,
  accountByNumber,
  pay,
  getTaxRule,
  getRate,
  fmtMoney,
  ownerName,
  displayUnitOf,
  primaryCurrency,
  ACCOUNT_TYPE_LABEL,
  type BankAccount,
} from "../../../lib/bank";
import type { User } from "../../../lib/db";
import { IcCheck, IcDoc, IcX } from "../../../lib/icons";

/* ============================================================
   Оплата по QR (АРГПЭЙ) — V1.7.
   Юридическое лицо получает платёжный QR на свой счёт.
   Гражданин сканирует/вводит код и ОПЛАЧИВАЕТ товар или услугу.
   Это именно оплата (тип PAY), а не перевод: она облагается
   налогом по правилу PAY, разница уходит на configured-счёт.
   Код: «ARGPAY1.» + base64url(JSON { a: номер счёта, s?, d? }).
   ============================================================ */

const b64e = (s: string) =>
  btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64d = (s: string) => decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/"))));

export function makePayload(accountNumber: string, opts: { amount?: number; desc?: string }): string {
  const payload: Record<string, string | number> = { a: accountNumber };
  if (opts.amount && opts.amount > 0) payload.s = opts.amount;
  if (opts.desc?.trim()) payload.d = opts.desc.trim();
  return "ARGPAY1." + b64e(JSON.stringify(payload));
}

export function parsePayload(raw: string): { a: string; s?: number; d?: string } | null {
  const s = raw.trim();
  try {
    let json = s;
    const m = s.match(/ARGPAY1\.([A-Za-z0-9_-]+)/);
    if (m) json = b64d(m[1]);
    const o = JSON.parse(json) as { a?: string; s?: number; d?: string };
    const num = (o.a ?? "").toString().replace(/\s/g, "");
    if (/^\d{16}$/.test(num)) {
      return {
        a: num,
        s: typeof o.s === "number" && o.s > 0 ? o.s : undefined,
        d: typeof o.d === "string" ? o.d : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

const fmtNum = (n: string) => n.replace(/(.{4})/g, "$1 ").trim();

export default function QrPage({ user }: { user: User }) {
  useBank();
  const [tab, setTab] = useState<"merchant" | "pay">("pay");
  const unit = displayUnitOf(user.login);

  return (
    <div>
      <div className="fadeUp flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="display text-xl font-extrabold tracking-wider">
            ОПЛАТА ПО <span className="text-[var(--gold)]">QR</span>
          </h2>
          <p className="mono mt-1 text-[10px] tracking-[0.2em] text-[var(--dim)]">
            АРГПЭЙ • ЮРЛИЦО ПРИНИМАЕТ ОПЛАТЫ • ГРАЖДАНИН ПЛАТИТ ЗА ТОВАРЫ/УСЛУГИ
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTab("pay")}
            className={`btn px-3.5 py-2 text-[11px] ${tab === "pay" ? "border-[var(--gold)] bg-[rgba(212,175,55,.08)] text-[var(--gold2)]" : ""}`}
          >
            Оплатить по коду
          </button>
          <button
            onClick={() => setTab("merchant")}
            className={`btn px-3.5 py-2 text-[11px] ${tab === "merchant" ? "border-[var(--gold)] bg-[rgba(212,175,55,.08)] text-[var(--gold2)]" : ""}`}
          >
            Мой платёжный QR
          </button>
        </div>
      </div>

      <div className="mt-5">
        {tab === "pay" ? <PayFlow user={user} unit={unit.label} /> : <MerchantQr user={user} />}
      </div>

      <p className="mono mt-5 border-l-2 border-[var(--gold)] bg-[rgba(212,175,55,.05)] px-3 py-2 text-[10px] leading-5 text-[var(--txt2)]">
        ОПЛАТА — ЭТО НЕ ПЕРЕВОД. С суммы удерживается налог по правилу «Оплата» (его настраивает Корона в
        «Налоговых правилах»), разница зачисляется на указанный счёт. Переводы между счетами налогом не
        облагаются.
      </p>
    </div>
  );
}

/* ================= получение QR (юрлицо) ================= */

function MerchantQr({ user }: { user: User }) {
  const my = accountsForUser(user.login).filter((a) => a.status === "ACTIVE");
  const [accId, setAccId] = useState(my[0]?.id ?? "");
  const [fixed, setFixed] = useState("");
  const [desc, setDesc] = useState("");
  const acc = accountById(accId);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const unit = displayUnitOf(user.login).label;

  const payload = useMemo(
    () => (acc ? makePayload(acc.number, { amount: Number(fixed.replace(",", ".")) || undefined, desc }) : ""),
    [acc, fixed, desc]
  );

  useEffect(() => {
    if (acc && canvasRef.current && payload) {
      QRCode.toCanvas(canvasRef.current, payload, {
        width: 232,
        margin: 2,
        color: { dark: "#1a1508", light: "#ebd9a0" },
      }).catch(() => {});
    }
  }, [payload, acc]);

  if (my.length === 0) {
    return (
      <div className="panel p-8 text-center">
        <p className="text-sm text-[var(--txt2)]">У вас нет активных счетов для приёма оплат.</p>
        <p className="mono mt-1 text-[10px] tracking-[0.2em] text-[var(--dim)]">ОТКРОЙТЕ СЧЁТ — ВКЛАДКА «НОВЫЙ СЧЁТ»</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <div className="panel fadeUp p-5">
        <h3 className="display text-sm font-bold tracking-wider">СЧЁТ ДЛЯ ПРИЁМА ОПЛАТ</h3>
        <div className="goldline my-3" />
        <label className="mono text-[10px] tracking-[0.2em] text-[var(--dim)]">СЧЁТ ЮРЛИЦА</label>
        <select value={accId} onChange={(e) => setAccId(e.target.value)} className="field mt-1">
          {my.map((a) => (
            <option key={a.id} value={a.id}>
              {fmtNum(a.number)} • {ACCOUNT_TYPE_LABEL[a.type]}
            </option>
          ))}
        </select>
        <label className="mono mt-3 block text-[10px] tracking-[0.2em] text-[var(--dim)]">ФИКСИРОВАННАЯ СУММА (НЕОБЯЗАТЕЛЬНО)</label>
        <input
          value={fixed}
          onChange={(e) => setFixed(e.target.value)}
          className="field mono mt-1"
          placeholder={`Например: 150 ${unit}`}
          inputMode="decimal"
        />
        <label className="mono mt-3 block text-[10px] tracking-[0.2em] text-[var(--dim)]">НАЗНАЧЕНИЕ (НЕОБЯЗАТЕЛЬНО)</label>
        <input
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          className="field mt-1"
          placeholder="Например: Пошлина за регистрацию"
        />
        <button
          className="btn mt-4 w-full"
          onClick={() => {
            navigator.clipboard?.writeText(payload).catch(() => {});
          }}
        >
          <IcDoc size={14} /> Скопировать платёжный код
        </button>
        <p className="mono mt-3 break-all text-[9.5px] leading-4 text-[var(--dim)]">{payload}</p>
      </div>

      <div className="panel fadeUp flex flex-col items-center justify-center p-6 text-center" style={{ animationDelay: "70ms" }}>
        <div className="border border-[var(--line2)] bg-[#ebd9a0] p-3">
          <canvas ref={canvasRef} />
        </div>
        <p className="display mt-4 text-sm font-bold tracking-wider">{acc ? ownerName(acc).toUpperCase() : "—"}</p>
        <p className="mono mt-1 text-[11px] text-[var(--txt2)]">{acc ? fmtNum(acc.number) : ""}</p>
        <p className="mono mt-2 max-w-sm text-[9.5px] leading-4 text-[var(--dim)]">
          Разместите код на кассе или в счёте. Гражданин сканирует его во вкладке «Оплатить по коду» и вносит
          оплату за товары или услуги.
        </p>
      </div>
    </div>
  );
}

/* ================= оплата (гражданин) ================= */

function PayFlow({ user, unit }: { user: User; unit: string }) {
  const my = accountsForUser(user.login).filter((a) => a.status === "ACTIVE");
  const [code, setCode] = useState("");
  const [merchant, setMerchant] = useState<BankAccount | null>(null);
  const [parseErr, setParseErr] = useState<string | null>(null);
  const [fromId, setFromId] = useState(my[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [receipt, setReceipt] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const resolve = (raw: string) => {
    setParseErr(null);
    setMerchant(null);
    setReceipt(null);
    const p = parsePayload(raw);
    if (!p) {
      setParseErr("Код не распознан. Нужен платёжный код АРГПЭЙ (начинается с ARGPAY1.) или QR-изображение.");
      return;
    }
    const acc = accountByNumber(p.a);
    if (!acc) {
      setParseErr("Счёт из кода не найден в реестре банка.");
      return;
    }
    if (acc.status !== "ACTIVE") {
      setParseErr("Счёт получателя не активен — оплата невозможна.");
      return;
    }
    setMerchant(acc);
    if (p.s) setAmount(String(p.s));
    if (p.d) setDesc(p.d);
  };

  const onFile = (f: File | null) => {
    if (!f) return;
    const img = new Image();
    const url = URL.createObjectURL(f);
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, c.width, c.height);
      const found = jsQR(data.data, data.width, data.height);
      URL.revokeObjectURL(url);
      if (found?.data) {
        setCode(found.data);
        resolve(found.data);
      } else {
        setParseErr("На изображении не найден QR-код.");
      }
    };
    img.src = url;
  };

  const from = accountById(fromId);
  const amt = Number(amount.replace(",", "."));
  const rule = getTaxRule("PAY");
  const prim = primaryCurrency();

  const breakdown = useMemo(() => {
    if (!merchant || !from || !(amt > 0)) return null;
    const rate = from.currency === merchant.currency ? 1 : getRate(from.currency, merchant.currency);
    if (rate === null) return null;
    const credited = amt * rate;
    const tax = (credited * rule.ratePct) / 100;
    return { rate, credited, tax, net: credited - tax, taxDest: rule.dest ? accountById(rule.dest) : null };
  }, [merchant, from, amt, rule]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchant) return;
    setReceipt(null);
    const res = pay({ fromId, toId: merchant.id, amount: amt, desc: desc || "Оплата по QR" });
    if (res.err) {
      setParseErr(res.err);
      return;
    }
    const taxTxt =
      rule.ratePct > 0 && breakdown?.tax
        ? ` • удержан налог ${rule.ratePct}% (${fmtMoney(breakdown.tax, merchant.currency)})`
        : "";
    setReceipt(
      `Оплата проведена: ${fmtMoney(amt, from?.currency ?? "")} → ${ownerName(merchant)}${taxTxt}. Получено продавцом: ${fmtMoney(breakdown?.net ?? 0, merchant.currency)}.`
    );
    setAmount("");
    setDesc("");
    setMerchant(null);
    setCode("");
  };

  if (my.length === 0) {
    return (
      <div className="panel p-8 text-center">
        <p className="text-sm text-[var(--txt2)]">У вас нет активных счетов для оплаты.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <form onSubmit={submit} className="panel fadeUp p-5">
        <h3 className="display flex items-center gap-2 text-sm font-bold tracking-wider">
          <IcDoc size={15} className="text-[var(--gold)]" /> СЧИТАТЬ ПЛАТЁЖНЫЙ КОД
        </h3>
        <div className="goldline my-3" />

        <label className="mono text-[10px] tracking-[0.2em] text-[var(--dim)]">ВСТАВЬТЕ КОД АРГПЭЙ</label>
        <div className="mt-1 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="field mono"
            placeholder="ARGPAY1.…"
            spellCheck={false}
          />
          <button type="button" className="btn shrink-0" onClick={() => resolve(code)}>
            Распознать
          </button>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <button type="button" className="btn text-[10.5px]" onClick={() => fileRef.current?.click()}>
            QR с изображения…
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
          <span className="mono text-[9.5px] text-[var(--dim)]">фото кода с кассы или другого устройства</span>
        </div>

        {parseErr && (
          <p className="mt-3 flex items-center gap-2 border border-[var(--red2)] bg-[rgba(139,0,0,.14)] px-3 py-2 text-[12px] text-[var(--red3)]">
            <IcX size={14} /> {parseErr}
          </p>
        )}

        {merchant && (
          <div className="siteIn mt-4 border border-[var(--gold)] bg-[rgba(212,175,55,.05)] p-4">
            <p className="mono text-[10px] tracking-[0.25em] text-[var(--gold2)]">ПОЛУЧАТЕЛЬ ОПЛАТЫ</p>
            <p className="display mt-1 text-lg font-extrabold">{ownerName(merchant)}</p>
            <p className="mono mt-0.5 text-[11px] text-[var(--txt2)]">
              {fmtNum(merchant.number)} • {ACCOUNT_TYPE_LABEL[merchant.type]} • {merchant.currency}
            </p>

            <label className="mono mt-4 block text-[10px] tracking-[0.2em] text-[var(--dim)]">СЧЁТ СПИСАНИЯ</label>
            <select value={fromId} onChange={(e) => setFromId(e.target.value)} className="field mt-1">
              {my.map((a) => (
                <option key={a.id} value={a.id}>
                  {fmtNum(a.number)} • {fmtMoney(a.balance, a.currency)}
                </option>
              ))}
            </select>

            <label className="mono mt-3 block text-[10px] tracking-[0.2em] text-[var(--dim)]">СУММА ОПЛАТЫ{from ? `, ${from.currency}` : ""}</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="field mono mt-1"
              placeholder={`0 ${unit}`}
              inputMode="decimal"
              required
            />
            <label className="mono mt-3 block text-[10px] tracking-[0.2em] text-[var(--dim)]">НАЗНАЧЕНИЕ</label>
            <input value={desc} onChange={(e) => setDesc(e.target.value)} className="field mt-1" placeholder="За товар/услугу" />

            {breakdown && (
              <div className="mono mt-4 space-y-1 border-t border-[var(--line)] pt-3 text-[11.5px] text-[var(--txt2)]">
                <p className="flex justify-between"><span>К зачислению продавцу</span><span className="text-[var(--txt)]">{fmtMoney(breakdown.credited, merchant.currency)}</span></p>
                <p className="flex justify-between">
                  <span>Налог «Оплата» ({rule.ratePct}%)</span>
                  <span className={rule.ratePct > 0 ? "text-[var(--red3)]" : "text-[var(--txt)]"}>− {fmtMoney(breakdown.tax, merchant.currency)}</span>
                </p>
                <p className="flex justify-between border-t border-[var(--line)] pt-1 text-[var(--txt)]">
                  <span>Продавец получит</span>
                  <span className="text-[var(--gold2)]">{fmtMoney(breakdown.net, merchant.currency)}</span>
                </p>
                {rule.ratePct > 0 && breakdown.taxDest && (
                  <p className="pt-1 text-[9.5px] text-[var(--dim)]">Налог уйдёт на: {ownerName(breakdown.taxDest)}</p>
                )}
              </div>
            )}

            <button type="submit" className="btn btn-gold mt-4 w-full py-3">
              <IcCheck size={15} /> Внести оплату
            </button>
          </div>
        )}

        {receipt && (
          <p className="mt-3 flex items-start gap-2 border border-[var(--gold)] bg-[rgba(212,175,55,.07)] px-3 py-2 text-[12px] text-[var(--gold2)]">
            <IcCheck size={14} className="mt-0.5 shrink-0" /> {receipt}
          </p>
        )}
      </form>

      <div className="panel fadeUp h-fit p-5" style={{ animationDelay: "80ms" }}>
        <h4 className="mono text-[10px] tracking-[0.25em] text-[var(--dim)]">КАК ЭТО РАБОТАЕТ</h4>
        <ol className="mono mt-3 space-y-2 text-[11px] leading-5 text-[var(--txt2)]">
          <li><span className="text-[var(--gold)]">1.</span> Юрлицо создаёт платёжный QR на свой счёт (вкладка «Мой платёжный QR»).</li>
          <li><span className="text-[var(--gold)]">2.</span> Вы сканируете или вставляете код — банк находит продавца.</li>
          <li><span className="text-[var(--gold)]">3.</span> Указываете сумму и вносите оплату. Это оплата (PAY), не перевод.</li>
          <li><span className="text-[var(--gold)]">4.</span> С суммы удерживается налог «Оплата»; продавец получает остаток.</li>
        </ol>
        <div className="goldline my-4" />
        <p className="mono text-[9.5px] leading-4 text-[var(--dim)]">
          ОСНОВНАЯ ВАЛЮТА — {prim?.code ?? "ATO"}. КОНВЕРТАЦИЯ И НАЛОГ ПРОЗРАЧНО ПОКАЗЫВАЮТСЯ ДО ПОДТВЕРЖДЕНИЯ.
        </p>
      </div>
    </div>
  );
}
