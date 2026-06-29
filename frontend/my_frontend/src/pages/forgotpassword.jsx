import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  requestPasswordReset,
  verifyPasswordResetOTP,
  confirmPasswordReset,
} from "../api/auth";
import api from "../api/axios";

const RESEND_SECS = 60;

function StrengthBar({ password }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score  = checks.filter(Boolean).length;
  const colors = ["bg-red-500","bg-orange-500","bg-yellow-500","bg-green-500"];
  const labels = ["Weak","Fair","Good","Strong"];
  if (!password) return null;
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1,2,3,4].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i<=score?colors[score-1]:"bg-gray-200 dark:bg-slate-700"}`}/>
        ))}
      </div>
      <div className="flex justify-between items-center">
        <span className={`text-xs font-medium ${colors[score-1]?.replace("bg-","text-")}`}>
          {labels[score-1]||""}
        </span>
        <div className="flex gap-2">
          {[
            [checks[0],"8+ chars"],
            [checks[1],"A-Z"],
            [checks[2],"0-9"],
            [checks[3],"!@#"],
          ].map(([ok,label]) => (
            <span key={label} className={`text-[10px] px-1.5 py-0.5 rounded ${ok?"bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400":"bg-gray-100 dark:bg-slate-800 text-gray-400"}`}>
              {ok?"✓ ":""}{label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ForgotPassword() {
  const navigate = useNavigate();

  // Method: 'email' | 'phone'
  const [method,  setMethod]  = useState("email");
  // Steps: 1=enter contact, 2=otp, 3=new password
  const [step,    setStep]    = useState(1);

  // Form values
  const [email,   setEmail]   = useState("");
  const [phone,   setPhone]   = useState("");
  const [otp,     setOtp]     = useState(["","","","","",""]);
  const [newPw,   setNewPw]   = useState("");
  const [cnfPw,   setCnfPw]   = useState("");
  const [showPw,  setShowPw]  = useState(false);
  const [resetToken, setResetToken] = useState("");

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");
  const [devOtp,  setDevOtp]  = useState("");

  const [timer,   setTimer]   = useState(0);
  const timerRef  = useRef(null);
  const otpRefs   = useRef([]);

  const startTimer = () => {
    setTimer(RESEND_SECS);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer((t) => { if (t <= 1) { clearInterval(timerRef.current); return 0; } return t - 1; });
    }, 1000);
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  const clearMessages = () => { setError(""); setSuccess(""); setDevOtp(""); };

  // ── Step 1: Send OTP ────────────────────────────────────────────────────────

  const handleSend = async (e) => {
    e?.preventDefault();
    clearMessages();

    if (method === "email" && !email.trim()) {
      setError("Please enter your email address."); return;
    }
    if (method === "phone" && !phone.trim()) {
      setError("Please enter your phone number."); return;
    }

    setLoading(true);
    try {
      let res;
      if (method === "email") {
        res = await requestPasswordReset(email.trim().toLowerCase());
      } else {
        res = await api.post("password-reset/phone/request/", { phone: phone.trim() });
      }
      if (res.data.dev_otp) setDevOtp(res.data.dev_otp);
      setSuccess(`OTP sent! Check your ${method === "email" ? "email inbox" : "phone"}.`);
      setStep(2);
      startTimer();
    } catch (err) {
      setError(err.response?.data?.error || "Could not send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── OTP input ─────────────────────────────────────────────────────────────

  const handleOtpChange = (val, idx) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp]; next[idx] = val; setOtp(next);
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyDown = (e, idx) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0)
      otpRefs.current[idx - 1]?.focus();
  };

  const handleOtpPaste = (e) => {
    const paste = e.clipboardData.getData("text").replace(/\D/g,"").slice(0,6);
    if (paste.length === 6) { setOtp(paste.split("")); otpRefs.current[5]?.focus(); }
  };

  // ── Step 2: Verify OTP ────────────────────────────────────────────────────

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length < 6) { setError("Please enter the full 6-digit code."); return; }
    setLoading(true); clearMessages();
    try {
      // For phone OTP, we still use the same verify endpoint (OTP is stored by user)
      // Backend identifies user by email or phone from the OTP record
      const contact = method === "email" ? email : phone;
      const fieldKey = method === "email" ? "email" : "phone";
      const res = await api.post("password-reset/verify/", { [fieldKey]: contact, otp: code });
      setResetToken(res.data.reset_token);
      setSuccess("Verified! Set your new password below.");
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || "Invalid or expired OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: New Password ──────────────────────────────────────────────────

  const handleReset = async (e) => {
    e.preventDefault();
    if (newPw !== cnfPw) { setError("Passwords do not match."); return; }
    if (newPw.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true); clearMessages();
    try {
      await confirmPasswordReset(resetToken, newPw);
      setSuccess("Password reset! Redirecting to login…");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.response?.data?.error || "Reset failed. Please start again.");
    } finally {
      setLoading(false);
    }
  };

  const inp =
    "w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 " +
    "text-gray-900 dark:text-white placeholder:text-slate-400 rounded-xl p-3 " +
    "focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm transition";

  const stepLabels = ["Choose Method", "Enter OTP", "New Password"];

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 p-8 sm:p-10 w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-3xl mb-4">
            🔐
          </div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white">Forgot Password</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
            {step === 1 && "Choose how you'd like to verify your identity."}
            {step === 2 && `Enter the 6-digit code sent to your ${method}.`}
            {step === 3 && "Create a strong new password."}
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-7">
          {[1,2,3].map((s) => (
            <div key={s} className={`rounded-full transition-all duration-300 ${s===step?"w-8 h-2.5 bg-emerald-500":s<step?"w-2.5 h-2.5 bg-emerald-500":"w-2.5 h-2.5 bg-gray-200 dark:bg-slate-700"}`}/>
          ))}
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-xl flex gap-2">
            <span className="material-symbols-outlined text-base flex-shrink-0 mt-0.5">error</span>
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm rounded-xl flex gap-2">
            <span className="material-symbols-outlined text-base flex-shrink-0 mt-0.5">check_circle</span>
            {success}
          </div>
        )}
        {devOtp && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 text-sm rounded-xl">
            <span className="font-bold">Dev OTP:</span> {devOtp}
          </div>
        )}

        {/* ── Step 1: Choose method + enter contact ── */}
        {step === 1 && (
          <form onSubmit={handleSend} className="space-y-5">
            {/* Method selector */}
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-3">
                Verification Method
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id:"email", label:"Email", icon:"mail" },
                  { id:"phone", label:"Phone", icon:"phone" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => { setMethod(m.id); clearMessages(); }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      method === m.id
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                        : "border-gray-200 dark:border-slate-700 hover:border-gray-300"
                    }`}
                  >
                    <span className={`material-symbols-outlined text-2xl ${method===m.id?"text-emerald-600 dark:text-emerald-400":"text-gray-400"}`}>
                      {m.icon}
                    </span>
                    <span className={`text-xs font-bold ${method===m.id?"text-emerald-700 dark:text-emerald-400":"text-gray-500"}`}>
                      {m.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Contact input */}
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                {method === "email" ? "Email Address" : "Phone Number"}
              </label>
              {method === "email" ? (
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className={inp}
                  required
                  autoFocus
                />
              ) : (
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className={inp}
                  required
                  autoFocus
                />
              )}
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                {method === "email"
                  ? "We'll send a 6-digit code to this address."
                  : "We'll send a 6-digit SMS to this number."}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">send</span>
                  Send OTP
                </>
              )}
            </button>
          </form>
        )}

        {/* ── Step 2: OTP input ── */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-3 text-center">
                Enter 6-Digit Code
              </label>
              <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => (otpRefs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(e.target.value, i)}
                    onKeyDown={(e) => handleOtpKeyDown(e, i)}
                    autoFocus={i === 0}
                    className={`
                      w-11 h-12 text-center text-xl font-bold rounded-xl border-2 transition-all
                      ${digit ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30" : "border-gray-200 dark:border-slate-700"}
                      bg-white dark:bg-slate-800 text-gray-900 dark:text-white
                      focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-400/30
                    `}
                  />
                ))}
              </div>
              <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-2">
                Code expires in 10 minutes
              </p>
            </div>

            <button
              onClick={handleVerify}
              disabled={loading || otp.some((d) => !d)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : "Verify Code"}
            </button>

            {/* Resend */}
            <div className="text-center text-sm text-slate-500 dark:text-slate-400">
              {timer > 0 ? (
                <span>
                  Resend in{" "}
                  <span className="font-bold text-emerald-600 tabular-nums">{timer}s</span>
                </span>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={loading}
                  className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-50"
                >
                  Resend Code
                </button>
              )}
            </div>

            <button
              onClick={() => { setStep(1); setOtp(["","","","","",""]); clearMessages(); }}
              className="w-full text-sm text-gray-500 dark:text-gray-400 hover:underline"
            >
              ← Change {method}
            </button>
          </div>
        )}

        {/* ── Step 3: New Password ── */}
        {step === 3 && (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className={`${inp} pr-11`}
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPw((p) => !p)}
                  className="absolute right-3.5 top-3 text-gray-400 hover:text-gray-600 transition"
                >
                  <span className="material-symbols-outlined text-lg">
                    {showPw ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
              <StrengthBar password={newPw} />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                Confirm Password
              </label>
              <input
                type={showPw ? "text" : "password"}
                value={cnfPw}
                onChange={(e) => setCnfPw(e.target.value)}
                placeholder="Repeat new password"
                className={`${inp} ${cnfPw && cnfPw !== newPw ? "border-red-400 focus:ring-red-400" : ""}`}
                required
              />
              {cnfPw && cnfPw !== newPw && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">error</span>
                  Passwords do not match
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || newPw !== cnfPw || newPw.length < 8}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">lock_reset</span>
                  Reset Password
                </>
              )}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-slate-500 dark:text-slate-300 mt-6">
          Remember your password?{" "}
          <Link to="/login" className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline">
            Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default ForgotPassword;