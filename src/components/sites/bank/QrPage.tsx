import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import jsQR from "jsqr";
import { useBank, accountsForUser, accountByNumber, fmtMoney, ownerName, displayUnitOf, UNIT_LEGEND } from "../../../lib/bank";
import type { User } from "../../../lib/db";
import { IcCheck, IcX } from "../../../lib/icons";

/* ============================================================
   Перевод по QR — переписан с нуля (V1.7).
   Платёжный код АРГПЭЙ-1: «ARGPAY1.» + base64url(JSON):
     { a: номер счёта (16), n?: имя, s?: сумма в То, d?: назначение }
   Распознавание: камера, файл-изображение или ручной ввод кода.
   ============================================================ */

export interface QrPrefill {
  toNum: string;
  amount?: string;
  desc?: string;
}

const b64e = (s: string) =>
  btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64d = (s: string) => decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/"))));

export function makePayload(accountNumber: string, opts: { name?: string; amount?: number; desc?: string }): string {
  const payload: Record<string, string | number> = { a: accountNumber };
  if (opts.name) payload.n = opts.name;
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
    if (typeof o.a === "string" && /^\d{16}$/.test(o.a.replace(/\s/g, ""))) {
      return { a: o.a.replace(/\s/g, ""), s: typeof o.s === "number" && o.s > 0 ? o.s : undefined, d: typeof o.d === "string" ? o.d : undefined };
    }
    return null;
  } catch {
    return null;
  }
}

type Mode = "show" | "scan";

export default function QrPage({ user, onPay }: { user: User; onPay: (p: QrPrefill) => void }) {
  useBank();
  const [mode, setMode] = useState<Mode>("show");
  const unit = displayUnitOf(user.login);

  return (
    <div>
      <div className="fadeUp flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="display text-xl font-extrabold tracking-wider">
            ПЕРЕВОД ПО <span className="text-[var(--gold)]">QR</span>
          </h2>
          <p className="mono mt-1 text-[10px] tracking-[0.2em] text-[var(--dim)]">
            ПЛАТЁЖНЫЙ КОД АРГПЭЙ-1 • СУММЫ В АРГСКИХ ТО ({UNIT_LEGEND})
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setMode("show")}
            className={`btn px-4 py-2 text-[11px] ${mode === "show" ? "border-[var(--gold)] bg-[rgba(212,175,55,.08)] text-[var(--gold2)]" : ""}`}
          >
            Мой код
          </button>
          <button
            onClick={() => setMode("scan")}
            className={`btn px-4 py-2 text-[11px] ${mode === "scan" ? "border-[var(--gold)] bg-[rgba(212,175,55,.08)] text-[var(--gold2)]" : ""}`}
          >
            Оплатить по коду
          </button>
        </div>
      </div>
      <div className="goldline mt-4" />
      <div className="mt-5">{mode === "show" ? <ShowCode user={user} unitLabel={unit.label} /> : <ScanCode user={user} onPay={onPay} />}</div>
    </div>
  );
}

/* ---------- показ собственного платёжного кода ---------- */

function ShowCode({ user, unitLabel }: { user: User; unitLabel: string }) {
  const my = accountsForUser(user.login).filter((a) => a.status === "ACTIVE");
  const [accId, setAccId] = useState(my[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const acc = my.find((a) => a.id === accId) ?? my[0];
  const amt = Number(amount.replace(",", "."));
  const code = acc ? makePayload(acc.number, { name: ownerName(acc), amount: amt > 0 ? amt : undefined, desc }) : "";

  useEffect(() => {
    let live = true;
    setDataUrl(null);
    if (!code) return;
    QRCode.toDataURL(code, { width: 520, margin: 2, color: { dark: "#111111", light: "#f4f1e8" } })
      .then((u) => live && setDataUrl(u))
      .catch(() => live && setDataUrl(null));
    return () => {
      live = false;
    };
  }, [code]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* буфер недоступен — код виден текстом ниже */
    }
  };

  if (!acc)
    return (
      <div className="panel p-8 text-center">
        <p className="text-sm text-[var(--txt2)]">Нет активных счетов — платёжный код создать нельзя.</p>
      </div>
    );

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <div className="panel fadeUp p-5">
        <h3 className="display text-sm font-bold tracking-wider">ПАРАМЕТРЫ КОДА</h3>
        <div className="goldline my-3" />
        <label className="mono text-[10px] tracking-[0.2em] text-[var(--dim)]">СЧЁТ ПОЛУЧЕНИЯ</label>
        <select value={acc.id} onChange={(e) => setAccId(e.target.value)} className="field mt-1">
          {my.map((a) => (
            <option key={a.id} value={a.id}>
              {a.number.slice(0, 4)} {a.number.slice(4, 8)} {a.number.slice(8, 12)} {a.number.slice(12)} • {fmtMoney(a.balance, a.currency)}
            </option>
          ))}
        </select>
        <label className="mono mt-4 block text-[10px] tracking-[0.2em] text-[var(--dim)]">СУММА, То (НЕОБЯЗАТЕЛЬНО)</label>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0,00" className="field mono mt-1" />
        <p className="mono mt-1 text-[9.5px] text-[var(--dim)]">
          {amt > 0 ? `≈ ${(amt / 1000).toLocaleString("ru-RU", { maximumFractionDigits: 0 })} ки… точнее: ${amt.toLocaleString("ru-RU")} То` : "если пусто — плательщик введёт сумму сам"}
        </p>
        <label className="mono mt-4 block text-[10px] tracking-[0.2em] text-[var(--dim)]">НАЗНАЧЕНИЕ (НЕОБЯЗАТЕЛЬНО)</label>
        <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Например: за товар" className="field mt-1" />
        <div className="goldline my-4" />
        <p className="mono text-[9.5px] leading-4 text-[var(--dim)]">
          ЕДИНИЦЫ: {UNIT_LEGEND}. КОД ДЕЙСТВИТЕЛЕН В ПРЕДЕЛАХ ARG-NET; ОТОБРАЖЕНИЕ: {unitLabel.toUpperCase()}.
        </p>
      </div>

      <div className="fadeUp flex flex-col items-center" style={{ animationDelay: "80ms" }}>
        <div className="border border-[var(--line2)] bg-[#f4f1e8] p-5 shadow-[0_10px_40px_rgba(0,0,0,.5)]">
          {dataUrl ? (
            <img src={dataUrl} alt="Платёжный QR-код" width={240} height={240} className="block" />
          ) : (
            <div className="flex h-60 w-60 items-center justify-center">
              <span className="mono text-[10px] tracking-[0.2em] text-[#555]">ФОРМИРОВАНИЕ КОДА…</span>
            </div>
          )}
        </div>
        <div className="mono mt-4 max-w-md break-all border border-[var(--line)] bg-[#0d0d0d] px-3 py-2 text-center text-[10px] leading-4 text-[var(--txt2)]">
          {code}
        </div>
        <button onClick={copy} className="btn mt-3 px-5 py-2 text-[11px]">
          {copied ? <IcCheck size={14} /> : null} {copied ? "Скопировано" : "Скопировать код"}
        </button>
        <p className="mono mt-3 max-w-md text-center text-[9.5px] leading-4 text-[var(--dim)]">
          ПЛАТЕЛЬЩИК ОТКРЫВАЕТ «ОПЛАТИТЬ ПО КОДУ» И НАВОДИТ КАМЕРУ (ЛИБО ЗАГРУЖАЕТ СНИМОК КОДА). СУММА И НАЗНАЧЕНИЕ
          ПОДСТАНОВЯТСЯ АВТОМАТИЧЕСКИ.
        </p>
      </div>
    </div>
  );
}

/* ---------- оплата по чужому коду ---------- */

function ScanCode({ user, onPay }: { user: User; onPay: (p: QrPrefill) => void }) {
  const [status, setStatus] = useState<{ kind: "idle" | "scanning" | "ok" | "err"; text: string }>({ kind: "idle", text: "Камера выключена" });
  const [manual, setManual] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const aliveRef = useRef(true);

  const stopCamera = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      stopCamera();
    };
  }, [stopCamera]);

  const handlePayload = (raw: string) => {
    const p = parsePayload(raw);
    if (!p) {
      setStatus({ kind: "err", text: "Код не распознан: это не платёжный код АРГПЭЙ-1" });
      return;
    }
    const acc = accountByNumber(p.a);
    if (!acc) {
      setStatus({ kind: "err", text: `Счёт ${p.a.slice(0, 4)}…${p.a.slice(-4)} не числится в реестре StatusBanko` });
      return;
    }
    if (acc.status !== "ACTIVE") {
      setStatus({ kind: "err", text: "Счёт получателя не активен — платёж невозможен" });
      return;
    }
    if (acc.user === user.login) {
      setStatus({ kind: "err", text: "Это ваш собственный счёт — перевод самому себе запрещён Уложением" });
      return;
    }
    stopCamera();
    setStatus({ kind: "ok", text: `Код принят: получатель ${ownerName(acc)}` });
    onPay({
      toNum: p.a,
      amount: p.s !== undefined ? String(p.s) : undefined,
      desc: p.d,
    });
  };

  const scanFrame = () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx || !canvas.width) return;
    ctx.drawImage(video, 0, 0);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const found = jsQR(img.data, img.width, img.height);
    if (found?.data) handlePayload(found.data);
  };

  const startCamera = async () => {
    setStatus({ kind: "scanning", text: "Запуск камеры…" });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (!aliveRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setStatus({ kind: "scanning", text: "Наведите камеру на платёжный код" });
      timerRef.current = window.setInterval(scanFrame, 280);
    } catch {
      setStatus({
        kind: "err",
        text: "Камера недоступна в этой среде. Загрузите снимок кода файлом или вставьте код вручную — это ниже.",
      });
    }
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setStatus({ kind: "scanning", text: "Чтение изображения…" });
    try {
      const url = URL.createObjectURL(f);
      const img = new Image();
      img.src = url;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas");
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const found = jsQR(data.data, data.width, data.height);
      if (found?.data) handlePayload(found.data);
      else setStatus({ kind: "err", text: "На изображении не найден платёжный код. Попробуйте более крупный снимок." });
    } catch {
      setStatus({ kind: "err", text: "Не удалось прочитать файл изображения" });
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="panel fadeUp p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="display text-sm font-bold tracking-wider">СКАНИРОВАНИЕ КАМЕРОЙ</h3>
          {status.kind === "scanning" ? (
            <button onClick={() => { stopCamera(); setStatus({ kind: "idle", text: "Камера выключена" }); }} className="btn btn-danger px-3 py-1.5 text-[10px]">
              <IcX size={12} /> Выключить
            </button>
          ) : (
            <button onClick={() => void startCamera()} className="btn btn-gold px-3 py-1.5 text-[10px]">
              Включить камеру
            </button>
          )}
        </div>
        <div className="goldline my-3" />
        <div className="relative flex min-h-56 items-center justify-center overflow-hidden border border-[var(--line)] bg-[#0a0a0a]">
          <video ref={videoRef} playsInline muted className={`max-h-72 w-full object-contain ${status.kind === "scanning" ? "" : "hidden"}`} />
          {status.kind !== "scanning" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="relative h-24 w-24">
                <span className="absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-[var(--gold)]" />
                <span className="absolute right-0 top-0 h-6 w-6 border-r-2 border-t-2 border-[var(--gold)]" />
                <span className="absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-[var(--gold)]" />
                <span className="absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-[var(--gold)]" />
              </div>
              <p className="mono text-[10px] tracking-[0.2em] text-[var(--dim)]">ЗОНА СКАНИРОВАНИЯ</p>
            </div>
          )}
          {status.kind === "scanning" && (
            <span className="pointer-events-none absolute inset-x-8 top-1/2 h-px bg-[var(--gold)] opacity-80" style={{ animation: "nblink 1.4s ease-in-out infinite" }} />
          )}
        </div>
        <p className={`mono mt-3 text-[11px] ${status.kind === "err" ? "text-[var(--red3)]" : status.kind === "ok" ? "text-[var(--gold2)]" : "text-[var(--txt2)]"}`}>
          {status.text}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="panel fadeUp p-5" style={{ animationDelay: "70ms" }}>
          <h3 className="display text-sm font-bold tracking-wider">СНИМОК КОДА</h3>
          <div className="goldline my-3" />
          <p className="text-[12px] leading-relaxed text-[var(--txt2)]">
            Если камеры нет под рукой — сфотографируйте код на другом устройстве и загрузите снимок: банк сам
            найдёт и разберёт платёжный код.
          </p>
          <label className="btn mt-3 w-full cursor-pointer py-3 text-[11px]">
            Выбрать изображение
            <input type="file" accept="image/*" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
          </label>
        </div>

        <div className="panel fadeUp p-5" style={{ animationDelay: "120ms" }}>
          <h3 className="display text-sm font-bold tracking-wider">РУЧНОЙ ВВОД</h3>
          <div className="goldline my-3" />
          <textarea
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            rows={3}
            placeholder="ARGPAY1.…"
            className="field mono break-all text-[11px]"
          />
          <button onClick={() => handlePayload(manual)} disabled={!manual.trim()} className="btn mt-3 w-full py-2.5 text-[11px]">
            Распознать код
          </button>
        </div>
      </div>
    </div>
  );
}
