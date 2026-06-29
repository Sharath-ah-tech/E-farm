import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import api from "../api/axios";
import { googleOAuthLogin, facebookOAuthLogin } from "../api/auth";

const FACEBOOK_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID || "";

function useFacebookSDK() {
  useEffect(() => {
    if (!FACEBOOK_APP_ID || document.getElementById("fb-sdk")) return;
    window.fbAsyncInit = function () {
      window.FB.init({ appId: FACEBOOK_APP_ID, cookie: true, xfbml: true, version: "v19.0" });
    };
    const s    = document.createElement("script");
    s.id       = "fb-sdk";
    s.src      = "https://connect.facebook.net/en_US/sdk.js";
    s.async    = s.defer = true;
    document.body.appendChild(s);
  }, []);
}

function Register() {
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [name,      setName]      = useState("");
  const [password,  setPassword]  = useState("");
  const [email,     setEmail]     = useState("");
  const [role,      setRole]      = useState("customer");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  const navigate = useNavigate();
  useFacebookSDK();

  const storeAndRedirect = (data) => {
    localStorage.setItem("access",   data.access);
    localStorage.setItem("refresh",  data.refresh);
    localStorage.setItem("username", data.username);
    localStorage.setItem("role",     data.role);
    navigate(data.profile_completed ? "/home" : "/profile-setup");
  };

  /* ── Email registration ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.post("register/", {
        first_name: firstName,
        last_name:  lastName,
        username:   name,
        email,
        password,
        role,
      });
      if (res.status === 201) {
        localStorage.setItem("register__username", name);
        navigate("/login");
      }
    } catch (err) {
      if (err.response?.data) {
        const d = err.response.data;
        const msgs = Object.entries(d).map(
          ([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`
        );
        setError(msgs.join("\n") || "Registration failed.");
      } else {
        setError("Something went wrong!");
      }
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
        storeAndRedirect(res.data);
      } catch (err) {
        setError(err.response?.data?.error || "Google sign-up failed.");
      } finally {
        setLoading(false);
      }
    },
    onError: () => setError("Google sign-up was cancelled."),
  });

  /* ── Facebook OAuth ── */
  const handleFacebook = () => {
    if (!FACEBOOK_APP_ID || !window.FB) {
      setError("Facebook login is not available right now.");
      return;
    }
    window.FB.login(
      async (response) => {
        if (!response.authResponse) return;
        setLoading(true);
        setError("");
        try {
          const res = await facebookOAuthLogin(response.authResponse.accessToken);
          storeAndRedirect(res.data);
        } catch (err) {
          setError(err.response?.data?.error || "Facebook sign-up failed.");
        } finally {
          setLoading(false);
        }
      },
      { scope: "public_profile,email" }
    );
  };

  const inp =
    "w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 " +
    "text-black dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 " +
    "rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-400";

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 p-8 sm:p-10 w-full max-w-lg transition-all duration-300">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-3xl mb-4">
            🌾
          </div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white">
            Create Account
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-300 mt-2">
            Join E-Farm to start selling or purchasing fresh products
          </p>
        </div>

        {/* Social sign-up */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            type="button"
            onClick={() => googleLogin()}
            disabled={loading}
            className="flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold py-2.5 rounded-xl text-sm transition disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign up with Google
          </button>

          <button
            type="button"
            onClick={handleFacebook}
            disabled={loading}
            className="flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold py-2.5 rounded-xl text-sm transition disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Sign up with Facebook
          </button>
        </div>

        <div className="relative mb-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-700" />
          </div>
          <span className="relative bg-white dark:bg-slate-800 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
            Or register with email
          </span>
        </div>

        {error && (
          <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/30 text-rose-700 dark:text-rose-400 text-sm px-4 py-3 rounded-xl mb-5 whitespace-pre-wrap flex items-start gap-2">
            <span className="mt-0.5">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                First Name
              </label>
              <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" className={inp} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Last Name
              </label>
              <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" className={inp} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Username *
            </label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Choose a unique username" className={inp} required />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Email Address *
            </label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className={inp} required />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Password *
              </label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" className={inp} required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                I am a
              </label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className={inp}>
                <option value="customer">Customer / Buyer</option>
                <option value="farmer">Farmer / Grower</option>
                <option value="wholesaler">Wholesaler</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <>
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating account…
              </>
            ) : (
              "Register"
            )}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 dark:text-slate-300 mt-7">
          Already have an account?{" "}
          <Link to="/login" className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline">
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;