import { useState } from "react";
import Gate from "./components/Gate";
import Browser, { ToastHost } from "./components/Browser";
import { addLog, getSession, setSession, toast, type User } from "./lib/db";

export default function App() {
  const [user, setUser] = useState<User | null>(() => getSession());

  const handleLogin = (u: User) => {
    setSession(u.login);
    setUser(u);
    toast(`Доступ разрешён. Слава Империи, ${u.name.split(" ").slice(-1)[0]}!`);
  };

  const handleLogout = () => {
    if (user) addLog(`${user.login}: выход из сети`);
    setSession(null);
    setUser(null);
    toast("Соединение разорвано. Узел 01 ждёт вашего возвращения.", "info");
  };

  return (
    <>
      {user ? <Browser user={user} onLogout={handleLogout} /> : <Gate onLogin={handleLogin} />}
      <ToastHost />
    </>
  );
}
