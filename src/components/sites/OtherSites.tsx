import { roleLabel, type User } from "../../lib/db";
import { Emblem, IcDoc, IcKey } from "../../lib/icons";

/* ================= login.arg (служебный узел SSO) ================= */

export function ServiceSite({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12 text-center">
      <Emblem size={72} className="mx-auto" />
      <p className="mono mt-4 text-[10px] tracking-[0.3em] text-[var(--dim)]">СЛУЖЕБНЫЙ УЗЕЛ • LOGIN.ARG : 8000</p>
      <h1 className="display mt-2 text-3xl font-extrabold">ЕДИНЫЙ ПОРТАЛ АУТЕНТИФИКАЦИИ</h1>
      <p className="mt-4 text-sm leading-relaxed text-[var(--txt2)]">
        Аутентификация уже пройдена — повторный вход не требуется. Узел login.arg осуществляет проверку
        IŦirinio по Государственному реестру паспортов и выдаёт мандат доступа к службам ЕГИКС.
      </p>

      <div className="panel mx-auto mt-6 max-w-md p-5 text-left">
        <h3 className="display text-sm font-bold tracking-wider">ТЕКУЩИЙ МАНДАТ</h3>
        <div className="goldline my-3" />
        <div className="mono space-y-2 text-[12px] text-[var(--txt2)]">
          <p>ДЕРЖАТЕЛЬ: <span className="text-[var(--gold2)]">{user.name}</span></p>
          <p>IŦIRINIO: <span className="break-all text-[var(--gold2)]">{user.itirinio}</span></p>
          <p>СТАТУС: <span className="text-[var(--gold2)]">{roleLabel(user.role)}</span></p>
          <p>ГИКС: <span className="text-[var(--gold2)]">{user.giks}</span></p>
        </div>
      </div>

      <div className="mt-6 flex justify-center gap-3">
        <button className="btn btn-danger" onClick={onLogout}>
          <IcKey size={14} /> Разорвать сеанс
        </button>
      </div>

      <p className="mono mt-8 flex items-center justify-center gap-2 text-[9.5px] tracking-[0.18em] text-[var(--dim)]">
        <IcDoc size={13} /> НЕСАНКЦИОНИРОВАННЫЙ ДОСТУП ПРЕСЛЕДУЕТСЯ ПО СТ. 14 (79) ЗАКОНА TOQORRO
      </p>
    </div>
  );
}
