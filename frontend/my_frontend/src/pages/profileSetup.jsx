import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { getTheme } from "../utils/theme";
import { getUserInfo } from "../api/auth";

const BASE_STEPS = [
  { id: 1, label: "Photo"   },
  { id: 2, label: "Contact" },
  { id: 3, label: "Business"},
];

const ROLES = [
  { value: "customer",   label: "Customer / Buyer",   icon: "shopping_cart",  desc: "Browse and buy fresh farm products" },
  { value: "farmer",     label: "Farmer / Grower",    icon: "agriculture",    desc: "Sell your harvest directly to buyers" },
  { value: "wholesaler", label: "Wholesaler",          icon: "warehouse",      desc: "Buy and sell in bulk quantities" },
];

function ProfileSetup() {
  const navigate      = useNavigate();
  const fileInputRef  = useRef(null);
  const theme         = getTheme();

  // OAuth detection
  const [isOauth,   setIsOauth]   = useState(false);
  const [steps,     setSteps]     = useState(BASE_STEPS);
  const [roleLocked, setRoleLocked] = useState(false);
  const [step,         setStep]         = useState(1);
  const [phone,        setPhone]        = useState("");
  const [address,      setAddress]      = useState("");
  const [district,     setDistrict]     = useState("");
  const [stateName,    setStateName]    = useState("");
  const [businessName, setBusinessName] = useState("");
  const [selectedRole, setSelectedRole] = useState("customer");
  const [image,        setImage]        = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isDragging,   setIsDragging]   = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");

  const username = localStorage.getItem("username") || "User";
  const roleLS   = localStorage.getItem("role")     || "customer";

  useEffect(() => {
    // Check if OAuth user
    getUserInfo().then((res) => {
    setIsOauth(res.data.is_oauth);
    setRoleLocked(res.data.role_locked);

    if (res.data.is_oauth && !res.data.role_locked) {
        setSteps([...BASE_STEPS, { id: 4, label: "Role" }]);
    } else {
        setSteps(BASE_STEPS);
    }
})
      .catch(() => {});
  }, []);

  const totalSteps = steps.length;

  const handleImageChange = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setImage(file);
    const reader    = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const canProceed = () => {
    if (step === 2) return phone.trim() !== "" && address.trim() !== "";
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const profileRes = await api.get("/profile/");
      const profile    =
        profileRes.data.results?.[0] ??
        (Array.isArray(profileRes.data) ? profileRes.data[0] : profileRes.data);

      if (!profile) {
        setError("Profile not found. Please try again.");
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append("phone",         phone);
      formData.append("address",       address);
      formData.append("district",      district);
      formData.append("state",         stateName);
      formData.append("business_name", businessName);
      formData.append("profile_completed", "true");
      if (image) formData.append("image", image);

      await api.patch(`/profile/${profile.id}/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // For OAuth users, lock in their chosen role
      if (isOauth && !roleLocked) {
    await api.post("/select-role/", {
        role: selectedRole,
    });

    localStorage.setItem("role", selectedRole);
}

      navigate("/home");
    } catch (err) {
      console.error(err);
      setError("Failed to save profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const progressPct = `${Math.round((step / totalSteps) * 100)}%`;

  const inputCls =
    "w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 " +
    "bg-white dark:bg-slate-800 text-gray-900 dark:text-white " +
    "placeholder-gray-400 dark:placeholder-slate-500 text-sm " +
    `focus:outline-none focus:ring-2 ${theme.ring} transition`;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* ── Form card ── */}
        <div className={`flex-1 ${theme.card} border ${theme.border} rounded-2xl shadow-sm p-6 lg:p-8 flex flex-col gap-6`}>

          {/* Header */}
          <div className="flex items-center gap-3">
            <span className="text-3xl">🌿</span>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                Complete your profile
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Help buyers and sellers know who you are
              </p>
            </div>
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-1">
            {steps.map((s, i) => (
              <div key={s.id} className="flex items-center gap-1.5">
                <button
                  onClick={() => step > s.id && setStep(s.id)}
                  disabled={step <= s.id}
                  className={
                    "w-8 h-8 rounded-full border-2 text-xs font-bold flex items-center justify-center flex-shrink-0 transition-all " +
                    (step > s.id
                      ? "border-emerald-600 bg-emerald-600 text-white cursor-pointer hover:bg-emerald-700"
                      : step === s.id
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400"
                      : "border-gray-300 dark:border-slate-600 text-gray-400 cursor-default")
                  }
                >
                  {step > s.id ? "✓" : s.id}
                </button>
                <span className={`text-xs font-semibold ${step >= s.id ? `${theme.default}` : "text-gray-400 dark:text-slate-500"}`}>
                  {s.label}
                </span>
                {i < steps.length - 1 && (
                  <div className={`w-8 h-0.5 mx-1 rounded-full transition-colors ${step > s.id ? "bg-emerald-600" : "bg-gray-200 dark:bg-slate-700"}`} />
                )}
              </div>
            ))}
          </div>

          {/* ── Step 1: Photo ── */}
          {step === 1 && (
            <div className="flex flex-col gap-4 flex-1">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add a profile photo</h2>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleImageChange(e.dataTransfer.files[0]); }}
                className={
                  "relative rounded-2xl border-2 border-dashed h-52 flex items-center justify-center cursor-pointer overflow-hidden transition-all " +
                  (isDragging ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950" :
                   imagePreview ? "border-emerald-500" :
                   "border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 hover:border-emerald-400")
                }
              >
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-all">
                      <span className="text-white text-sm font-semibold bg-black/30 px-3 py-1 rounded-full">Change photo</span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-3 p-6 text-center pointer-events-none">
                    <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center">
                      <span className="material-symbols-outlined text-3xl text-emerald-600">upload</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Drag & drop or click to upload</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">PNG, JPG or WEBP · up to 5 MB</p>
                    </div>
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageChange(e.target.files[0])} />
              <p className="text-xs text-center text-gray-400">You can skip this step and add a photo later.</p>
            </div>
          )}

          {/* ── Step 2: Contact ── */}
          {step === 2 && (
            <div className="flex flex-col gap-4 flex-1">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Your contact details</h2>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Phone number *</label>
                <input type="tel" placeholder="+91 98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} autoFocus className={inputCls} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Full address *</label>
                <textarea placeholder="House / plot no., street, area…" value={address} onChange={(e) => setAddress(e.target.value)} rows={4} className={`${inputCls} resize-y`} />
              </div>
            </div>
          )}

          {/* ── Step 3: Business ── */}
          {step === 3 && (
            <div className="flex flex-col gap-4 flex-1">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Location & business</h2>
              <div className="flex gap-3">
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">District</label>
                  <input type="text" placeholder="Erode" value={district} onChange={(e) => setDistrict(e.target.value)} autoFocus className={inputCls} />
                </div>
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">State</label>
                  <input type="text" placeholder="Tamil Nadu" value={stateName} onChange={(e) => setStateName(e.target.value)} className={inputCls} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                  Business Name (optional)
                </label>
                <input type="text" placeholder="Green Valley Farm / Sunrise Traders" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className={inputCls} />
              </div>
              {error && (
                <div className="p-3.5 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-400">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* ── Step 4: Role (OAuth only) ── */}
          {step === 4 && isOauth && (
            <div className="flex flex-col gap-4 flex-1">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">I want to join as a…</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Your role determines what you can do on E-Farm.
                </p>
              </div>

              <div className="space-y-3">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setSelectedRole(r.value)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                      selectedRole === r.value
                        ? `border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40`
                        : "border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                      selectedRole === r.value ? "bg-emerald-500 text-white" : "bg-gray-100 dark:bg-slate-800 text-gray-500"
                    }`}>
                      <span className="material-symbols-outlined text-2xl">{r.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-sm ${selectedRole === r.value ? "text-emerald-700 dark:text-emerald-400" : "text-gray-900 dark:text-white"}`}>
                        {r.label}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{r.desc}</p>
                    </div>
                    {selectedRole === r.value && (
                      <span className="material-symbols-outlined text-emerald-500 flex-shrink-0">check_circle</span>
                    )}
                  </button>
                ))}
              </div>

              {error && (
                <div className="p-3.5 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-400">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* ── Navigation ── */}
          <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-slate-700">
            {step > 1 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-slate-700 active:scale-[0.98] transition"
              >
                ← Back
              </button>
            )}

            {step < totalSteps ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canProceed()}
                className={
                  "flex-1 py-2.5 rounded-xl font-bold text-sm text-white transition active:scale-[0.98] " +
                  (canProceed() ? "bg-emerald-600 hover:bg-emerald-700" : "bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-700 cursor-not-allowed")
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
                  (loading ? "bg-emerald-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98]")
                }
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving…
                  </span>
                ) : "Save Profile ✓"}
              </button>
            )}
          </div>
        </div>

        {/* ── Preview card ── */}
        <aside className="lg:w-72 flex flex-col gap-4">
          <p className="text-xs font-bold text-gray-400 dark:text-slate-500 tracking-widest uppercase">Preview</p>
          <div className={`${theme.card} border ${theme.border} rounded-2xl overflow-hidden shadow-sm`}>
            <div className={`h-20 bg-gradient-to-r ${theme.title}`} />
            <div className="px-5 pb-5 flex flex-col items-center gap-2.5">
              <div className={`-mt-9 w-16 h-16 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center bg-white dark:bg-slate-900 ${theme.secondary} ring-4 ring-white dark:ring-slate-900 shadow-sm`}>
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <span className={`text-xl font-bold ${theme.text}`}>
                    {username.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white text-center">{username}</h3>
              <span className={`px-3 py-0.5 rounded-full text-xs font-bold capitalize ${theme.secondary} ${theme.text}`}>
                {isOauth ? selectedRole : roleLS}
              </span>
              <div className={`w-full border-t ${theme.border} pt-3 flex flex-col gap-2`}>
                {phone && <div className="flex items-start gap-2"><span className="text-sm">📞</span><span className="text-xs text-gray-600 dark:text-gray-300">{phone}</span></div>}
                {(district || stateName) && <div className="flex items-start gap-2"><span className="text-sm">📍</span><span className="text-xs text-gray-600 dark:text-gray-300">{[district, stateName].filter(Boolean).join(", ")}</span></div>}
                {businessName && <div className="flex items-start gap-2"><span className="text-sm">🏢</span><span className="text-xs text-gray-600 dark:text-gray-300">{businessName}</span></div>}
                {!phone && !district && !businessName && (
                  <p className="text-xs text-gray-400 dark:text-slate-500 text-center py-2">Your details appear here as you fill them in.</p>
                )}
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="flex flex-col gap-1.5">
            <div className="h-1.5 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
              <div className="h-full bg-emerald-600 rounded-full transition-all duration-500" style={{ width: progressPct }} />
            </div>
            <p className="text-xs text-gray-400 dark:text-slate-500 text-right">Step {step} of {totalSteps}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default ProfileSetup;