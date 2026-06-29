import api from "./axios";

const normalize = (r) => ({
  ...r,
  data: Array.isArray(r.data) ? r.data : r.data?.results || [],
});

/** My own orders (as buyer) */
export const getOrders = (params = {}) =>
  api.get("orders/", { params }).then(normalize);

/** Orders placed by customers for my listings (farmer/wholesaler only) */
export const getCustomerOrders = (params = {}) =>
  api.get("customer-orders/", { params }).then(normalize);

/** Single order detail */
export const getOrderDetail = (id) => api.get(`orders/${id}/`);

/** Cancel a pending order */
export const cancelOrder = (id) => api.post(`orders/${id}/cancel/`);