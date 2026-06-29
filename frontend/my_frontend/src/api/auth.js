import api from "./axios";

export const googleOAuthLogin  = (accessToken) => api.post("auth/google/",   { access_token: accessToken });
export const facebookOAuthLogin = (accessToken) => api.post("auth/facebook/", { access_token: accessToken });

// Password Reset
export const requestPasswordReset  = (email) => api.post("password-reset/request/", { email });
export const verifyPasswordResetOTP = (email, otp) => api.post("password-reset/verify/", { email, otp });
export const confirmPasswordReset  = (reset_token, new_password) =>
  api.post("password-reset/confirm/", { reset_token, new_password });

// OAuth user info
export const getUserInfo = () => api.get("user-info/");