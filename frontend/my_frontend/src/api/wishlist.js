import api from "./axios";

const normalize = (r) => ({
  ...r,
  data: Array.isArray(r.data) ? r.data : r.data?.results || [],
});

export const getWishlist = () => api.get("wishlist/").then(normalize);

export const addWishlist = (productId) =>
  api.post("wishlist/", { product: productId });

export const removeWishlist = (id) => api.delete(`wishlist/${id}/`);