import api from "./axios";

export const getProductReviews = (productId) =>
  api.get(`reviews/?product=${productId}`);

export const getListingReviews = (listingId) =>
  api.get(`reviews/?listing=${listingId}`);

export const addReview = (data) =>
  api.post("reviews/", data);

export const updateReview = (id, data) =>
  api.patch(`reviews/${id}/`, data);

export const deleteReview = (id) =>
  api.delete(`reviews/${id}/`);