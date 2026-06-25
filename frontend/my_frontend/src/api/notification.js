import api from "./axios";

export const getNotifications = () => api.get("notifications/");

export const markAsRead = (id) =>
  api.patch(`notifications/${id}/`, { is_read: true });

export const deleteNotification = (id) =>
  api.delete(`notifications/${id}/`);
