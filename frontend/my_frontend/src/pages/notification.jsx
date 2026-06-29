import { useEffect, useState, useCallback } from "react";
import { getTheme } from "../utils/theme";
import { getNotifications, markAsRead, deleteNotification } from "../api/notification";
import { useNotifications } from "../contexts/NotificationContext";
import { useToast } from "../utils/toast";
import api from "../api/axios";

const TYPE_ICONS  = { order:"receipt_long", payment:"payments", review:"rate_review", discount:"local_offer", stock:"inventory_2", system:"notifications" };
const TYPE_COLORS = { order:"text-blue-500", payment:"text-green-500", review:"text-yellow-500", discount:"text-orange-500", stock:"text-red-500", system:"text-purple-500" };
const TYPE_BG     = { order:"bg-blue-50 dark:bg-blue-900/20", payment:"bg-green-50 dark:bg-green-900/20", review:"bg-yellow-50 dark:bg-yellow-900/20", discount:"bg-orange-50 dark:bg-orange-900/20", stock:"bg-red-50 dark:bg-red-900/20", system:"bg-purple-50 dark:bg-purple-900/20" };

function groupByDate(notifications) {
  const today     = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const groups    = { Today: [], Yesterday: [], Older: [] };
  notifications.forEach((n) => {
    const d = new Date(n.created_at);
    if (d.toDateString() === today.toDateString())     groups.Today.push(n);
    else if (d.toDateString() === yesterday.toDateString()) groups.Yesterday.push(n);
    else groups.Older.push(n);
  });
  return groups;
}

function NotificationCard({ notification, theme, onMarkRead, onDelete }) {
  const icon  = TYPE_ICONS[notification.notification_type]  || "notifications";
  const color = TYPE_COLORS[notification.notification_type] || "text-gray-500";
  const bg    = TYPE_BG[notification.notification_type]     || "bg-gray-50 dark:bg-slate-800";

  return (
    <div className={`relative rounded-2xl p-4 flex gap-4 border transition-all duration-200 ${notification.is_read ? `${theme.card} ${theme.border} opacity-70` : `${bg} border-current ${color} shadow-sm`}`}>
      {!notification.is_read && <div className="absolute top-4 right-14 w-2 h-2 rounded-full bg-blue-500" />}
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${notification.is_read ? "bg-gray-100 dark:bg-slate-700" : "bg-white dark:bg-slate-800"}`}>
        <span className={`material-symbols-outlined text-xl ${color}`}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold leading-snug ${notification.is_read ? "text-gray-600 dark:text-gray-300" : "text-gray-900 dark:text-white"}`}>{notification.title}</p>
        {notification.message && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{notification.message}</p>}
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1">
          <span className="material-symbols-outlined text-xs">schedule</span>
          {new Date(notification.created_at).toLocaleString("en-IN", { hour:"2-digit", minute:"2-digit", day:"2-digit", month:"short", year:"numeric" })}
        </p>
      </div>
      <div className="flex flex-col gap-1.5 flex-shrink-0">
        {!notification.is_read && (
          <button onClick={() => onMarkRead(notification.id)} title="Mark as read" className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 flex items-center justify-center hover:bg-emerald-200 transition active:scale-90">
            <span className="material-symbols-outlined text-sm">done</span>
          </button>
        )}
        <button onClick={() => onDelete(notification.id)} title="Delete" className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400 flex items-center justify-center hover:bg-red-200 transition active:scale-90">
          <span className="material-symbols-outlined text-sm">delete</span>
        </button>
      </div>
    </div>
  );
}

function NotificationPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const theme                             = getTheme();

  // Context: to update the navbar badge
  const { setUnreadCount } = useNotifications();
  const toast              = useToast();

  const load = useCallback(() => {
    setLoading(true);
    getNotifications()
      .then((r) => {
        const data = r.data?.results ?? (Array.isArray(r.data) ? r.data : []);
        setNotifications(data);
        // Sync badge immediately
        setUnreadCount(data.filter((n) => !n.is_read).length);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [setUnreadCount]);

  useEffect(() => { load(); }, [load]);

  const handleMarkRead = async (id) => {
    try {
      await markAsRead(id);
      setNotifications((p) => p.map((n) => n.id === id ? { ...n, is_read: true } : n));
      // ← Badge decrements immediately
      setUnreadCount((c) => Math.max(0, c - 1));
      toast.show("Marked as read", "success");
    } catch { toast.show("Failed to mark as read", "error"); }
  };

  const handleDelete = async (id) => {
    const wasUnread = notifications.find((n) => n.id === id)?.is_read === false;
    try {
      await deleteNotification(id);
      setNotifications((p) => p.filter((n) => n.id !== id));
      if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
      toast.show("Notification deleted", "info");
    } catch { toast.show("Failed to delete", "error"); }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post("notifications/mark_all_read/");
      setNotifications((p) => p.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);   // ← Instantly clear badge
      toast.show("All notifications marked as read", "success");
    } catch { toast.show("Failed", "error"); }
  };

  const handleClearRead = async () => {
    const readItems = notifications.filter((n) => n.is_read);
    if (!readItems.length) return;
    await Promise.allSettled(readItems.map((n) => deleteNotification(n.id)));
    setNotifications((p) => p.filter((n) => !n.is_read));
    toast.show(`Cleared ${readItems.length} read notification${readItems.length!==1?"s":""}`, "info");
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const groups      = groupByDate(notifications);

  return (
    <div className={`min-h-screen ${theme.page}`}>
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-10">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className={`text-2xl font-bold ${theme.text}`}>Notifications</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up!"}
            </p>
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className={`px-4 py-2 rounded-xl text-xs font-bold ${theme.secondary} ${theme.text} border ${theme.border} hover:shadow transition flex items-center gap-1`}>
                <span className="material-symbols-outlined text-sm">done_all</span>Mark all read
              </button>
            )}
            {notifications.some((n) => n.is_read) && (
              <button onClick={handleClearRead} className="px-4 py-2 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">sweep</span>Clear read
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-20 rounded-2xl bg-gray-200 dark:bg-slate-800 animate-pulse" />)}</div>
        ) : notifications.length === 0 ? (
          <div className={`${theme.card} rounded-2xl border ${theme.border} p-16 text-center shadow-sm`}>
            <span className="material-symbols-outlined text-7xl text-gray-300 dark:text-slate-600 block mb-4">notifications_none</span>
            <h2 className="text-xl font-bold text-gray-500 dark:text-gray-400">No Notifications</h2>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">We'll notify you about orders, discounts, and reviews.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groups).map(([name, items]) => {
              if (!items.length) return null;
              return (
                <div key={name}>
                  <div className="flex items-center gap-3 mb-3">
                    <h2 className={`text-xs font-bold uppercase tracking-widest ${theme.text}`}>{name}</h2>
                    <div className={`flex-1 h-px border-t ${theme.border}`} />
                    <span className="text-xs text-gray-400">{items.length}</span>
                  </div>
                  <div className="space-y-2">
                    {items.map((n) => (
                      <NotificationCard key={n.id} notification={n} theme={theme} onMarkRead={handleMarkRead} onDelete={handleDelete} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default NotificationPage;