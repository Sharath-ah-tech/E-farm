import api from './axios'

export const getWishlist = () =>
  api.get("wishlist/");

export const addWishlist = (productId) =>
  api.post("wishlist/", {
    product: productId
  });

export const removeWishlist = (wishlistId) =>
  api.delete(`wishlist/${wishlistId}/`);
