export const addNotification = (
  title,
  message = ""
) => {
  const notifications =
    JSON.parse(
      localStorage.getItem("notifications")
    ) || [];

  const newNotification = {
    id: Date.now(), // unique id
    title,
    message,
    is_read: false,
    created_at: new Date().toISOString(),
  };

  notifications.unshift(newNotification);

  localStorage.setItem(
    "notifications",
    JSON.stringify(notifications)
  );
};
