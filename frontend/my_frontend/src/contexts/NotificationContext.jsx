import { createContext, useContext, useState, useCallback, useEffect } from "react";
import api from "../api/axios";

const NotificationContext = createContext({
  unreadCount:    0,
  setUnreadCount: () => {},
  refresh:        async () => {},
});

export function NotificationProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    const token = localStorage.getItem("access");
    if (!token) {
      setUnreadCount(0);
      return;
    }
    try {
      const res  = await api.get("notifications/");
      const data = res.data?.results ?? (Array.isArray(res.data) ? res.data : []);
      setUnreadCount(data.filter((n) => !n.is_read).length);
    } catch {
      setUnreadCount(0);
    }
  }, []);

  // Refresh on mount and whenever localStorage changes (login/logout)
  useEffect(() => {
    refresh();
    const onStorage = (e) => {
      if (e.key === "access") refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);

  return (
    <NotificationContext.Provider value={{ unreadCount, setUnreadCount, refresh }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);