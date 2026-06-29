import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import api from "../api/axios";
import { googleOAuthLogin, facebookOAuthLogin } from "../api/auth";

const FACEBOOK_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID || "";

/* ── helper: store auth response and redirect ─────────────────────────────── */
function useAuthSuccess(setUserName) {
  const navigate = useNavigate();

  return (data) => {
    localStorage.setItem("access",    data.access);
    localStorage.setItem("refresh",   data.refresh);
    localStorage.setItem("username",  data.username);
    localStorage.setItem("role",      data.role);
    setUserName(data.username);
    navigate(data.profile_completed ? "/home" : "/profile-setup");
  };
}

/* ── Load Facebook JS SDK once ───────────────────────────────────────────── */
function useFacebookSDK() {
  useEffect(() => {
    if (!FACEBOOK_APP_ID) return;
    if (document.getElementById("fb-sdk")) return;

    window.fbAsyncInit = function () {
      window.FB.init({
        appId:   FACEBOOK_APP_ID,
        cookie:  true,
        xfbml:   true,
        version: "v19.0",
      });
    };

    const script    = document.createElement("script");
    script.id       = "fb-sdk";
    script.src      = "https://connect.facebook.net/en_US/sdk.js";
    script.async    = true;
    script.defer    = true;
    document.body.appendChild(script);
  }, []);
}

/* ── Login Page ──────────────────────────────────────────────────────────── */
function Login({ setUserName }) {
  const [name,     setName]     = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const navigate    = useNavigate();
  const handleAuth  = useAuthSuccess(setUserName);
  useFacebookSDK();

  /* ── Email / password login ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.post("login/", {
        username: name,
        password,
      });
      const d = res.data;
      localStorage.setItem("access",   d.access);
      localStorage.setItem("refresh",  d.refresh);
      localStorage.setItem("username", d.username);
      localStorage.setItem("role",     d.role);
      setUserName(d.username);

      // Check profile completion
      try {
        const pRes = await api.get("profile/");
        const prof =
          pRes.data?.results?.[0] ??
          (Array.isArray(pRes.data) ? pRes.data[0] : pRes.data);
        navigate(prof?.profile_completed ? "/home" : "/profile-setup");
      } catch {
        navigate("/home");
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
        "Invalid username or password."
      );
    } finally {
      setLoading(false);
    }
  };

  /* ── Google OAuth ── */
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResp) => {
      setLoading(true);
      setError("");
      try {
        const res = await googleOAuthLogin(tokenResp.access_token);
        handleAuth(res.data);
      } catch (err) {
        setError(
          err.response?.data?.error || "Google login failed. Please try again."
        );
      } finally {
        setLoading(false);
      }
    },
    onError: () => setError("Google login was cancelled or failed."),
  });

  /* ── Facebook OAuth ── */
  const handleFacebook = () => {
    if (!FACEBOOK_APP_ID) {
      setError("Facebook login is not configured yet.");
      return;
    }
    if (!window.FB) {
      setError("Facebook SDK is still loading. Please try again.");
      return;
    }
    window.FB.login(
      async (response) => {
        if (!response.authResponse) {
          setError("Facebook login was cancelled.");
          return;
        }
        setLoading(true);
        setError("");
        try {
          const res = await facebookOAuthLogin(
            response.authResponse.accessToken
          );
          handleAuth(res.data);
        } catch (err) {
          setError(
            err.response?.data?.error ||
            "Facebook login failed. Please try again."
          );
        } finally {
          setLoading(false);
        }
      },
      { scope: "public_profile,email" }
    );
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 p-8 sm:p-10 w-full max-w-md transition-all duration-300">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-3xl mb-4">
            🚜
          </div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white">
            Welcome Back
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-300 mt-2">
            Log in to manage your farm orders & purchases
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/30 text-rose-700 dark:text-rose-400 text-sm px-4 py-3 rounded-xl mb-6 flex items-start gap-2">
            <span className="mt-0.5">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Username
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your username"
              className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-black dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              required
            />
          </div>
<div className="space-y-1">
  <div className="flex justify-between items-center">
    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
      Password
    </label>
    {/* ← Add this link */}
    <Link
      to="/forgot-password"
      className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
    >
      Forgot password?
    </Link>
  </div>
  <input
    type="password"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    placeholder="Enter your password"
    className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-black dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-400"
    required
  />
</div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Logging in…
              </>
            ) : (
              "Log In"
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-7 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-700" />
          </div>
          <span className="relative bg-white dark:bg-slate-800 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
            Or continue with
          </span>
        </div>

        {/* Social buttons */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* Google */}
          <button
            type="button"
            onClick={() => googleLogin()}
            disabled={loading}
            className="flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold py-2.5 rounded-xl text-sm transition-colors duration-200 disabled:opacity-50"
          >
            {/* Google SVG icon */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google
          </button>

          {/* Facebook */}
          <button
            type="button"
            onClick={handleFacebook}
            disabled={loading}
            className="flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold py-2.5 rounded-xl text-sm transition-colors duration-200 disabled:opacity-50"
          >
            {/* Facebook icon */}
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            Facebook
          </button>
        </div>

        <p className="text-center text-sm text-slate-500 dark:text-slate-300">
          New here?{" "}
          <Link
            to="/register"
            className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Create an Account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;