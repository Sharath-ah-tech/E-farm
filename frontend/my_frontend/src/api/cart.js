import api from "./axios";

const normalize = (r) => ({
  ...r,

  
  data: Array.isArray(r.data) ? r.data : r.data?.results || [],
});

export const getCart = () => api.get("cart/").then(normalize);

export const addToCart = (listingId, quantity = 1) =>
  api.post("cart/", { listing: listingId, quantity });

export const updateCart = (id, quantity) =>
  api.patch(`cart/${id}/`, { quantity });

export const removeFromCart = (id) => api.delete(`cart/${id}/`);