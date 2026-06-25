import { useEffect, useState } from "react";
import { getTheme } from "../utils/theme";

function NotificationPage() {
  const [notifications, setNotifications] = useState([]);

  const theme = getTheme();

  useEffect(() => {
    const loadNotifications = () => {
      const data =
        JSON.parse(
          localStorage.getItem("notifications")
        ) || [];

      setNotifications(data);
    };

    loadNotifications();

    window.addEventListener(
      "storage",
      loadNotifications
    );

    return () => {
      window.removeEventListener(
        "storage",
        loadNotifications
      );
    };
  }, []);

  const markAsRead = (id) => {
    const updated = notifications.map((n) =>
      n.id === id
        ? { ...n, is_read: true }
        : n
    );

    setNotifications(updated);

    localStorage.setItem(
      "notifications",
      JSON.stringify(updated)
    );
  };

  const deleteNotification = (id) => {
    const updated = notifications.filter(
      (n) => n.id !== id
    );

    setNotifications(updated);

    localStorage.setItem(
      "notifications",
      JSON.stringify(updated)
    );
  };

  const clearAll = () => {
    localStorage.removeItem("notifications");
    setNotifications([]);
  };

  const unreadCount = notifications.filter(
    (n) => !n.is_read
  ).length;

  return (
    <div className={`min-h-screen p-6 ${theme.page}`}>
      <div className="max-w-4xl mx-auto">
        <div
          className={`${theme.card} rounded-3xl shadow-xl p-6 border ${theme.border}`}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1
                className={`text-3xl font-black ${theme.text}`}
              >
                Notifications
              </h1>

              <p className="text-slate-500 dark:text-slate-400">
                {unreadCount} unread notifications
              </p>
            </div>

            <button
              onClick={clearAll}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition"
            >
              Clear All
            </button>
          </div>

          {/* Empty State */}
          {notifications.length === 0 ? (
            <div className="text-center py-16">
              <span className="material-symbols-outlined text-6xl text-slate-400">
                notifications_off
              </span>

              <h2 className="text-xl font-bold mt-4 text-slate-700 dark:text-slate-200">
                No Notifications
              </h2>
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`
                    rounded-xl
                    p-4
                    flex
                    justify-between
                    items-start
                    border
                    transition-all
                    ${
                      notification.is_read
                        ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                        : "bg-blue-50 dark:bg-slate-800 border-blue-200 dark:border-slate-600"
                    }
                  `}
                >
                  <div>
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                      {notification.title}
                    </h3>

                    {notification.message && (
                      <p className="mt-1 text-slate-600 dark:text-slate-300">
                        {notification.message}
                      </p>
                    )}

                    <small className="text-slate-400 dark:text-slate-500">
                      {new Date(
                        notification.created_at
                      ).toLocaleString()}
                    </small>
                  </div>

                  <div className="flex gap-2">
                    {!notification.is_read && (
                      <button
                        onClick={() =>
                          markAsRead(notification.id)
                        }
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded-lg transition"
                      >
                        Read
                      </button>
                    )}

                    <button
                      onClick={() =>
                        deleteNotification(notification.id)
                      }
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default NotificationPage;