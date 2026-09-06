import { useState } from "react";
import Gate from "./components/Gate";
import Browser, { ToastHost } from "./components/Browser";
import { addLog, getSession, setSession, toast, type User } from "./lib/db";

export default function App() {
  const [user, setUser] = useState<User | null>(() => getSession());

  const handleLogin = (u: User) => {
    setSession(u.login);
    setUser(u);
  };

  const handleLogout = () => {
    if (user) addLog(`${user.login}: выход из сети (разрыв сеанса)`);
    setSession(null);
    setUser(null);
    toast("Соединение разорвано. Сеанс закрыт, мандат отозван.", "info");
  };

  return (
    <>
      {user ? <Browser user={user} onLogout={handleLogout} /> : <Gate onLogin={handleLogin} />}
      <ToastHost />
    </>
  );
}
