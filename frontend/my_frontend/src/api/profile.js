import api from "./axios";

const normalizeProfile = (res) => ({
  ...res,
  data:
    res.data?.results?.[0] ??
    (Array.isArray(res.data) ? res.data[0] : res.data),
});

export const getProfile = () => api.get("profile/").then(normalizeProfile);

export const updateProfile = (id, data) =>
  api.patch(`profile/${id}/`, data, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const getFarmerDashboard = () => api.get("farmer-dashboard/");
export const getWholesalerDashboard = () => api.get("wholesaler-dashboard/");
export const getCustomerDashboard = () => api.get("customer-dashboard/");