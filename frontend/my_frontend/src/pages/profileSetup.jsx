import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { getTheme } from "../utils/theme";

const STEPS = [
  { id: 1, label: "Photo" },
  { id: 2, label: "Contact" },
  { id: 3, label: "Business" },
];

function ProfileSetup() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const theme = getTheme();

  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [district, setDistrict] = useState("");
  const [stateName, setStateName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const username = localStorage.getItem("username") || "Your Name";
  const role = localStorage.getItem("role") || "member";

  /* ── helpers ─────────────────────────────────── */
  const handleImageChange = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleImageChange(e.dataTransfer.files[0]);
  };

  const canProceed = () => {
    if (step === 2) return phone.trim() !== "" && address.trim() !== "";
    return true;
  };

  const progressPct = `${Math.round((step / 3) * 100)}%`;

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const profileRes = await api.get("/profile/");
      console.log(profileRes);
      
      const profile =
        profileRes.data.results?.[0] ||
        (Array.isArray(profileRes.data)
          ? profileRes.data[0]
          : profileRes.data);

      if (!profile) {
        setError("Profile not found. Please try again.");
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append("phone", phone);
      formData.append("address", address);
      formData.append("district", district);
      formData.append("state", stateName);
      formData.append("business_name", businessName);
      if (image) formData.append("image", image);

      await api.patch(`/profile/${profile.id}/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      navigate("/profile");
    } catch (err) {
      console.error(err);
      setError("Failed to save profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ── shared input class ──────────────────────── */
  const inputCls =
    "w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 " +
    "bg-white dark:bg-slate-800 text-gray-900 dark:text-white " +
    "placeholder-gray-400 dark:placeholder-slate-500 text-sm " +
    `focus:outline-none focus:ring-2 focus:ring-offset-0 ${theme.ring}`  +
    `dark:${theme.ring} transition`;

  /* ── render ─────────────────────────────────── */
  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* ════════════════════════════════════════
            LEFT — form card
        ════════════════════════════════════════ */}
        <div
          className={
            `flex-1 ${theme.card} border ${theme.border} ` +
            "rounded-2xl shadow-sm p-6 lg:p-8 flex flex-col gap-6"
          }
        >
          {/* Header */}
          <div className="flex items-center gap-3">
            <span className="text-3xl leading-none select-none" aria-hidden="true">🌿</span>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                Complete your profile
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Help buyers and sellers know who you are
              </p>
            </div>
          </div>

          {/* ── Step indicator ── */}
          <div className="flex items-center gap-0.5">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-1.5">
                {/* Circle */}
                <button
                  onClick={() => step > s.id && setStep(s.id)}
                  disabled={step <= s.id}
                  aria-label={`Go to step ${s.id}: ${s.label}`}
                  className={
                    "w-8 h-8 rounded-full border-2 text-xs font-bold flex items-center justify-center flex-shrink-0 transition-all " +
                    (step > s.id
                      ? "border-emerald-600 bg-emerald-600 text-white cursor-pointer hover:bg-emerald-700"
                      : step === s.id
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400"
                      : "border-gray-300 dark:border-slate-600 text-gray-400 dark:text-slate-500 cursor-default")
                  }
                >
                  {step > s.id ? "✓" : s.id}
                </button>
                {/* Label */}
                <span
                  className={
                    "text-xs font-semibold " +
                    (step >= s.id
                      ? `${theme.default} dark:text-emerald-400`
                      : "text-gray-400 dark:text-slate-500")
                  }
                >
                  {s.label}
                </span>
                {/* Connector */}
                {i < STEPS.length - 1 && (
                  <div
                    className={
                      "w-8 h-0.5 mx-1 rounded-full flex-shrink-0 transition-colors duration-300 " +
                      (step > s.id
                        ? "bg-emerald-600 dark:bg-emerald-500"
                        : "bg-gray-200 dark:bg-slate-700")
                    }
                  />
                )}
              </div>
            ))}
          </div>

          {/* ══════════════════
              STEP 1 — Photo
          ══════════════════ */}
          {step === 1 && (
            <div className="flex flex-col gap-4 flex-1">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Add a profile photo
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  A photo helps others recognise you on the platform.
                </p>
              </div>

              {/* Drop zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                role="button"
                tabIndex={0}
                aria-label="Upload profile photo"
                onKeyDown={(e) =>
                  e.key === "Enter" && fileInputRef.current?.click()
                }
                className={
                  "relative rounded-2xl border-2 border-dashed h-52 flex items-center " +
                  "justify-center cursor-pointer overflow-hidden transition-all duration-200 " +
                  (isDragging
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950"
                    : imagePreview
                    ? "border-emerald-500"
                    : "border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 " +
                      "hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-slate-700/60")
                }
              >
                {imagePreview ? (
                  <>
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-all duration-200">
                      <span className="text-white text-sm font-semibold bg-black/30 px-3 py-1 rounded-full">
                        Change photo
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-3 p-6 text-center pointer-events-none">
                    <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center">
                      <svg
                        width="26"
                        height="26"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="text-emerald-600 dark:text-emerald-400"
                        aria-hidden="true"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                        Drag & drop or click to upload
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        PNG, JPG or WEBP · up to 5 MB
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageChange(e.target.files[0])}
              />

              <p className="text-xs text-center text-gray-400 dark:text-slate-500">
                You can skip this and add a photo later.
              </p>
            </div>
          )}

          {/* ══════════════════
              STEP 2 — Contact
          ══════════════════ */}
          {step === 2 && (
            <div className="flex flex-col gap-4 flex-1">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Your contact details
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Used for delivery and order communication.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 tracking-wide uppercase">
                  Phone number *
                </label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoFocus
                  className={inputCls}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 tracking-wide uppercase">
                  Full address *
                </label>
                <textarea
                  placeholder="House / plot no., street, area…"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={4}
                  className={`${inputCls} resize-y`}
                />
              </div>
            </div>
          )}

          {/* ══════════════════
              STEP 3 — Business
          ══════════════════ */}
          {step === 3 && (
            <div className="flex flex-col gap-4 flex-1">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Location & business
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Help us match you with nearby products and sellers.
                </p>
              </div>

              <div className="flex gap-3">
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 tracking-wide uppercase">
                    District
                  </label>
                  <input
                    type="text"
                    placeholder="Erode"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    autoFocus
                    className={inputCls}
                  />
                </div>
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 tracking-wide uppercase">
                    State
                  </label>
                  <input
                    type="text"
                    placeholder="Tamil Nadu"
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 tracking-wide uppercase">
                  {role === "farmer"
                    ? "Farm name"
                    : role === "wholesaler"
                    ? "Business name"
                    : "Organisation (optional)"}
                </label>
                <input
                  type="text"
                  placeholder={
                    role === "farmer" ? "Green Valley Farm" : "Sunrise Traders"
                  }
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className={inputCls}
                />
              </div>

              {error && (
                <div className="flex items-start gap-2.5 p-3.5 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl">
                  <span className="text-red-500 dark:text-red-400 text-sm leading-none mt-0.5">⚠</span>
                  <p className="text-xs text-red-700 dark:text-red-400 leading-relaxed">
                    {error}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Navigation buttons ── */}
          <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-slate-700">
            {step > 1 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className={
                  "px-5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 " +
                  "bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 " +
                  "font-semibold text-sm hover:bg-gray-50 dark:hover:bg-slate-700 " +
                  "active:scale-[0.98] transition"
                }
              >
                ← Back
              </button>
            )}

            {step < 3 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canProceed()}
                className={
                  "flex-1 py-2.5 rounded-xl font-bold text-sm text-white transition active:scale-[0.98] " +
                  (canProceed()
                    ? "bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                    : "bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-700 cursor-not-allowed")
                }
              >
                Continue →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className={
                  "flex-1 py-2.5 rounded-xl font-bold text-sm text-white transition " +
                  (loading
                    ? "bg-emerald-400 dark:bg-emerald-800 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 active:scale-[0.98]")
                }
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                    </svg>
                    Saving…
                  </span>
                ) : (
                  "Save profile ✓"
                )}
              </button>
            )}
          </div>
        </div>

        {/* ════════════════════════════════════════
            RIGHT — live preview
        ════════════════════════════════════════ */}
        <aside
          className="lg:w-72 flex flex-col gap-4"
          aria-label="Profile preview"
        >
          <p className="text-xs font-bold text-gray-400 dark:text-slate-500 tracking-widest uppercase">
            Preview
          </p>

          {/* Preview card */}
          <div
            className={
              `${theme.card} border ${theme.border} ` +
              "rounded-2xl overflow-hidden shadow-sm"
            }
          >
            {/* Cover gradient */}
            <div
              className={`h-20 bg-gradient-to-r ${theme.title}`}
              aria-hidden="true"
            />

            <div className="px-5 pb-5 flex flex-col items-center gap-2.5">
              {/* Avatar */}
              <div
                className={
                  "-mt-9 w-16 h-16 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center " +
                  "bg-white dark:bg-slate-900 " +
                  `${theme.secondary} ` +
                  "ring-4 ring-white dark:ring-slate-900 shadow-sm"
                }
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Profile preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className={`text-xl font-bold ${theme.text}`}>
                    {username.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <h3 className="text-base font-bold text-gray-900 dark:text-white text-center">
                {username}
              </h3>

              <span
                className={
                  `px-3 py-0.5 rounded-full text-xs font-bold capitalize ${theme.secondary} ${theme.text}`
                }
              >
                {role}
              </span>

              {/* Details list */}
              <div
                className={`w-full border-t ${theme.border} pt-3 mt-0.5 flex flex-col gap-2`}
              >
                {phone && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm flex-shrink-0" aria-hidden="true">📞</span>
                    <span className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                      {phone}
                    </span>
                  </div>
                )}
                {(district || stateName) && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm flex-shrink-0" aria-hidden="true">📍</span>
                    <span className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                      {[district, stateName].filter(Boolean).join(", ")}
                    </span>
                  </div>
                )}
                {businessName && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm flex-shrink-0" aria-hidden="true">🏢</span>
                    <span className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                      {businessName}
                    </span>
                  </div>
                )}
                {address && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm flex-shrink-0" aria-hidden="true">🏠</span>
                    <span className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                      {address.length > 55
                        ? address.slice(0, 55) + "…"
                        : address}
                    </span>
                  </div>
                )}

                {!phone && !district && !businessName && !address && (
                  <p className="text-xs text-gray-400 dark:text-slate-500 text-center py-2 leading-relaxed">
                    Your details will appear here as you fill them in.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex flex-col gap-1.5">
            <div className="h-1.5 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
              <div
                className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: progressPct }}
                role="progressbar"
                aria-valuenow={step}
                aria-valuemin={1}
                aria-valuemax={3}
              />
            </div>
            <p className="text-xs text-gray-400 dark:text-slate-500 text-right">
              Step {step} of 3
            </p>
          </div>
        </aside>

      </div>
    </div>
  );
}

export default ProfileSetup;