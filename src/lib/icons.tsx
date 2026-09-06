import type { ReactNode } from "react";

type P = { size?: number; className?: string; sw?: number };

const S = ({ size = 18, className, sw = 1.7, children }: P & { children: ReactNode }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={sw}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {children}
  </svg>
);

export const IcArrowL = (p: P) => (
  <S {...p}>
    <path d="M15 5l-7 7 7 7" />
  </S>
);
export const IcArrowR = (p: P) => (
  <S {...p}>
    <path d="M9 5l7 7-7 7" />
  </S>
);
export const IcHome = (p: P) => (
  <S {...p}>
    <path d="M3 11l9-8 9 8" />
    <path d="M5 10v10h5v-6h4v6h5V10" />
  </S>
);
export const IcRefresh = (p: P) => (
  <S {...p}>
    <path d="M20 11a8 8 0 1 0-2.3 6.3" />
    <path d="M20 4v7h-7" />
  </S>
);
export const IcLock = (p: P) => (
  <S {...p}>
    <rect x="5" y="11" width="14" height="9" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </S>
);
export const IcSearch = (p: P) => (
  <S {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </S>
);
export const IcMail = (p: P) => (
  <S {...p}>
    <rect x="3" y="5" width="18" height="14" />
    <path d="M3 7l9 6 9-6" />
  </S>
);
export const IcPhone = (p: P) => (
  <S {...p}>
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
  </S>
);
export const IcPhoneOff = (p: P) => (
  <S {...p}>
    <path d="M10.7 13.3a11 11 0 0 1-2.2-3.8L10 8l-2-4H5A2 2 0 0 0 3 6a16 16 0 0 0 4.3 8.7" />
    <path d="M13.6 16.4A16 16 0 0 0 18 21a2 2 0 0 0 2-2v-3l-4-2-1.5 1.5" />
    <path d="M3 3l18 18" />
  </S>
);
export const IcSend = (p: P) => (
  <S {...p}>
    <path d="M22 2L11 13" />
    <path d="M22 2l-7 20-4-9-9-4z" />
  </S>
);
export const IcTrash = (p: P) => (
  <S {...p}>
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6M14 11v6" />
  </S>
);
export const IcReply = (p: P) => (
  <S {...p}>
    <path d="M9 14L4 9l5-5" />
    <path d="M4 9h10a6 6 0 0 1 6 6v4" />
  </S>
);
export const IcUsers = (p: P) => (
  <S {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
    <path d="M16 5.5a3.5 3.5 0 0 1 0 6.6" />
    <path d="M17.5 14.5a6.5 6.5 0 0 1 4 5.5" />
  </S>
);
export const IcGlobe = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18" />
  </S>
);
export const IcPlus = (p: P) => (
  <S {...p}>
    <path d="M12 5v14M5 12h14" />
  </S>
);
export const IcX = (p: P) => (
  <S {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </S>
);
export const IcKey = (p: P) => (
  <S {...p}>
    <circle cx="8" cy="15" r="4.5" />
    <path d="M11.5 11.5L20 3" />
    <path d="M16 7l3 3M13.5 9.5l2 2" />
  </S>
);
export const IcClock = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" />
  </S>
);
export const IcBan = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M5.5 5.5l13 13" />
  </S>
);
export const IcCrown = (p: P) => (
  <S {...p}>
    <path d="M4 18h16" />
    <path d="M4 18l-1-9 5 4 4-7 4 7 5-4-1 9" />
  </S>
);
export const IcDoc = (p: P) => (
  <S {...p}>
    <path d="M6 2h9l4 4v16H6z" />
    <path d="M15 2v4h4" />
    <path d="M9 12h7M9 16h7" />
  </S>
);
export const IcTower = (p: P) => (
  <S {...p}>
    <path d="M12 9v13" />
    <path d="M8 22l4-13 4 13" />
    <circle cx="12" cy="7" r="2" />
    <path d="M7.8 2.8a6 6 0 0 0 0 8.4M16.2 2.8a6 6 0 0 1 0 8.4" />
  </S>
);
export const IcPower = (p: P) => (
  <S {...p}>
    <path d="M12 2v8" />
    <path d="M6.3 6.3a8 8 0 1 0 11.4 0" />
  </S>
);
export const IcCheck = (p: P) => (
  <S {...p}>
    <path d="M4 12l5 5L20 6" />
  </S>
);
export const IcChevD = (p: P) => (
  <S {...p}>
    <path d="M6 9l6 6 6-6" />
  </S>
);
export const IcMic = (p: P) => (
  <S {...p}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0" />
    <path d="M12 18v3" />
  </S>
);
export const IcMicOff = (p: P) => (
  <S {...p}>
    <path d="M15 10V6a3 3 0 0 0-5.6-1.5" />
    <path d="M9 9v2a3 3 0 0 0 5.2 2" />
    <path d="M5 11a7 7 0 0 0 10.6 6M19 11a7 7 0 0 1-.4 2.4" />
    <path d="M12 18v3" />
    <path d="M3 3l18 18" />
  </S>
);
export const IcHold = (p: P) => (
  <S {...p}>
    <path d="M9 5v14M15 5v14" />
  </S>
);
export const IcSpeaker = (p: P) => (
  <S {...p}>
    <path d="M4 9v6h4l5 4V5L8 9z" />
    <path d="M16.5 8.5a5 5 0 0 1 0 7" />
    <path d="M19 6a8.5 8.5 0 0 1 0 12" />
  </S>
);
export const IcShield = (p: P) => (
  <S {...p}>
    <path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" />
    <path d="M8.5 12l2.5 2.5 4.5-5" />
  </S>
);
export const IcInbox = (p: P) => (
  <S {...p}>
    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
    <path d="M5 5h14l3 7v7H2v-7z" />
  </S>
);
export const IcOutbox = (p: P) => (
  <S {...p}>
    <path d="M7 17L17 7" />
    <path d="M9 7h8v8" />
    <rect x="3" y="3" width="18" height="18" />
  </S>
);
export const IcEye = (p: P) => (
  <S {...p}>
    <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z" />
    <circle cx="12" cy="12" r="2.8" />
  </S>
);
export const IcEyeOff = (p: P) => (
  <S {...p}>
    <path d="M4 4l16 16" />
    <path d="M9.9 5.8A10.7 10.7 0 0 1 12 5.5c6.5 0 10 6.5 10 6.5a17.6 17.6 0 0 1-3 3.8M6.1 8.3A17 17 0 0 0 2 12s3.5 6.5 10 6.5a10.4 10.4 0 0 0 3.9-.7" />
  </S>
);
export const IcSignal = (p: P) => (
  <S {...p}>
    <path d="M4 18v-3M9 18v-7M14 18V7M19 18V3" />
  </S>
);
export const IcWarn = (p: P) => (
  <S {...p}>
    <path d="M12 3L1.5 21h21z" />
    <path d="M12 10v5M12 18v.5" />
  </S>
);
export const IcNode = (p: P) => (
  <S {...p}>
    <circle cx="5" cy="12" r="2.5" />
    <circle cx="19" cy="6" r="2.5" />
    <circle cx="19" cy="18" r="2.5" />
    <path d="M7.3 10.8l9.4-3.6M7.3 13.2l9.4 3.6" />
  </S>
);
export const IcBank = (p: P) => (
  <S {...p}>
    <path d="M3 9l9-6 9 6" />
    <path d="M4 9h16" />
    <path d="M6 9v9M10 9v9M14 9v9M18 9v9" />
    <path d="M3 18h18M2 21h20" />
  </S>
);
export const IcScale = (p: P) => (
  <S {...p}>
    <path d="M12 3v18M8 21h8" />
    <path d="M5 6h14" />
    <path d="M5 6l-2.5 6a3 3 0 0 0 5 0L5 6zM19 6l-2.5 6a3 3 0 0 0 5 0L19 6z" />
  </S>
);
export const IcRadar = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="4.5" />
    <path d="M12 12L18 5" />
    <circle cx="15" cy="15" r="0.5" fill="currentColor" />
  </S>
);
export const IcStamp = (p: P) => (
  <S {...p}>
    <path d="M9 3h6l-1 7h3a3 3 0 0 1 3 3v3H4v-3a3 3 0 0 1 3-3h3z" />
    <path d="M4 20h16" />
  </S>
);

/* ---------- Малый государственный герб Аргской Империи ---------- */

export const Emblem = ({ size = 120, className }: { size?: number; className?: string }) => (
  <svg viewBox="0 0 120 132" width={size} height={(size * 132) / 120} className={className} fill="none" aria-hidden="true">
    {/* скрещённые мечи */}
    <g stroke="var(--gold)" strokeWidth="1.1" opacity="0.55">
      <path d="M22 104 L88 30 M84 26 l8 8 M20 100 l8 8" />
      <path d="M98 104 L32 30 M28 26 l8 8 M92 100 l8 8" />
    </g>
    {/* корона */}
    <g stroke="var(--gold)" strokeWidth="1.4">
      <path d="M44 24 L48 10 L56 19 L60 6 L64 19 L72 10 L76 24 Z" />
      <rect x="44" y="24" width="32" height="5" />
    </g>
    <circle cx="60" cy="4.5" r="1.8" style={{ fill: "var(--red2)" }} />
    {/* щит */}
    <path
      d="M60 34 L88 43 V78 C88 97 74 109 60 116 C46 109 32 97 32 78 V43 Z"
      stroke="var(--gold)"
      strokeWidth="1.8"
      fill="rgba(139,0,0,0.14)"
    />
    <path
      d="M60 40 L82 47.5 V77 C82 92 71 102 60 108 C49 102 38 92 38 77 V47.5 Z"
      stroke="var(--gold)"
      strokeWidth="0.7"
      opacity="0.6"
    />
    <text
      x="60"
      y="86"
      textAnchor="middle"
      fontFamily="'Playfair Display', Georgia, serif"
      fontWeight="900"
      fontSize="38"
      style={{ fill: "var(--gold2)" }}
    >
      А
    </text>
    {/* лента */}
    <path d="M34 112 H86 L92 124 H28 Z" fill="var(--red)" stroke="var(--gold)" strokeWidth="0.9" />
    <text
      x="60"
      y="121.5"
      textAnchor="middle"
      fontFamily="'IBM Plex Mono', monospace"
      fontSize="7.5"
      letterSpacing="3"
      style={{ fill: "var(--gold2)" }}
    >
      АРГИЯ
    </text>
  </svg>
);

/* ---------- марки узлов ---------- */

export const SiteMark = ({ label, hue, size = 34 }: { label: string; hue: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <path d="M20 3 L35 11.5 V28.5 L20 37 L5 28.5 V11.5 Z" style={{ fill: hue }} opacity="0.12" />
    <path d="M20 3 L35 11.5 V28.5 L20 37 L5 28.5 V11.5 Z" style={{ stroke: hue }} strokeWidth="1.4" />
    <text
      x="20"
      y="25.5"
      textAnchor="middle"
      fontFamily="'Playfair Display', Georgia, serif"
      fontWeight="800"
      fontSize={label.length > 1 ? 11 : 15}
      style={{ fill: hue }}
    >
      {label}
    </text>
  </svg>
);
