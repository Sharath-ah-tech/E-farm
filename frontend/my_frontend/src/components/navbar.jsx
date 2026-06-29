import { Link, NavLink, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { getTheme } from "../utils/theme";
import { useNotifications } from "../contexts/NotificationContext";
import api from "../api/axios";

const CAT_EMOJI = { Vegetables:"🥦", Fruits:"🍎", Seeds:"🌱", Tools:"🔧", Pesticide:"🧪", Greens:"🥬" };

function SearchBar({ searchTerm, setSearchTerm, theme }) {
  const [results, setResults]     = useState({ products:[], categories:[], sellers:[] });
  const [open, setOpen]           = useState(false);
  const [fetching, setFetching]   = useState(false);
  const wrapRef   = useRef(null);
  const debRef    = useRef(null);
  const navigate  = useNavigate();

  useEffect(() => {
    const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    clearTimeout(debRef.current);
    if (!searchTerm || searchTerm.length < 2) { setResults({ products:[], categories:[], sellers:[] }); setOpen(false); return; }
    debRef.current = setTimeout(async () => {
      setFetching(true);
      try {
        const res = await api.get(`search/?q=${encodeURIComponent(searchTerm)}`);
        setResults(res.data);
        setOpen(res.data.products.length > 0 || res.data.categories.length > 0 || res.data.sellers.length > 0);
      } catch { setOpen(false); } finally { setFetching(false); }
    }, 350);
    return () => clearTimeout(debRef.current);
  }, [searchTerm]);

  const go = (path) => { setOpen(false); setSearchTerm(""); navigate(path); };

  return (
    <div ref={wrapRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          placeholder="Search products, sellers, categories…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => { if (results.products.length || results.categories.length || results.sellers.length) setOpen(true); }}
          onKeyDown={(e) => { if (e.key === "Escape") { setOpen(false); setSearchTerm(""); } }}
          className={`w-full rounded-full px-5 py-2.5 pl-11 pr-9 border border-white/30 text-gray-800 dark:text-white bg-white/90 dark:bg-slate-800 placeholder:text-gray-400 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 ${theme.ring} text-sm transition`}
        />
        <span className={`material-symbols-outlined absolute left-3.5 top-2.5 text-lg ${theme.icons}`}>search</span>
        {fetching && <div className="absolute right-3.5 top-3 w-4 h-4 border-2 border-t-transparent border-gray-400 rounded-full animate-spin" />}
        {!fetching && searchTerm && (
          <button onClick={() => { setSearchTerm(""); setOpen(false); }} className="absolute right-3.5 top-2.5 text-gray-400 hover:text-gray-600 transition">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 z-[100] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden max-h-80 overflow-y-auto">
          {results.products.length > 0 && (
            <>
              <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 bg-gray-50 dark:bg-slate-800">Products</div>
              {results.products.map((p) => (
                <button key={p.id} onClick={() => go(`/productdetail/${p.id}`)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800 text-left transition">
                  <div className="w-9 h-9 rounded-xl overflow-hidden bg-gray-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                    {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-contain" onError={(e)=>{e.target.style.display="none"}} /> : <span>{CAT_EMOJI[p.category]||"📦"}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.category} · From ₹{p.lowest_price} · {p.seller_count} seller{p.seller_count!==1?"s":""}</p>
                  </div>
                  <span className="material-symbols-outlined text-sm text-gray-300">arrow_outward</span>
                </button>
              ))}
            </>
          )}
          {results.categories.length > 0 && (
            <>
              <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 bg-gray-50 dark:bg-slate-800">Categories</div>
              <div className="flex flex-wrap gap-2 px-4 py-3">
                {results.categories.map((cat) => (
                  <button key={cat} onClick={() => go("/home")} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full text-xs font-semibold text-gray-700 dark:text-gray-300 transition">
                    <span>{CAT_EMOJI[cat]||"📦"}</span>{cat}
                  </button>
                ))}
              </div>
            </>
          )}
          {results.sellers.length > 0 && (
            <>
              <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 bg-gray-50 dark:bg-slate-800">Sellers</div>
              {results.sellers.map((s) => (
                <button key={s.id} onClick={() => go(`/seller/${s.id}`)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800 text-left transition">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 bg-gradient-to-br ${s.role==="farmer"?"from-emerald-500 to-teal-600":"from-orange-500 to-amber-600"}`}>
                    {s.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{s.username}</p>
                    <p className="text-xs text-gray-400 truncate">{s.business_name||s.role}{s.district?` · ${s.district}`:""}</p>
                  </div>
                  <span className="material-symbols-outlined text-sm text-gray-300">arrow_outward</span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Navbar({ userName, darkMode, setDarkMode, searchTerm, setSearchTerm }) {
  const theme                        = getTheme();
  const { unreadCount }              = useNotifications();  // ← from context

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 ${theme.heading}`}>
      <nav className="max-w-7xl mx-auto px-4 py-2.5">
        <div className="flex items-center gap-3 md:gap-5">
          <Link to="/home" className="flex items-center gap-2 flex-shrink-0 hover:opacity-90 transition">
            <span className="text-3xl md:text-4xl">🚜</span>
            <span className="text-xl md:text-2xl font-black text-white hidden sm:block">E-Farm</span>
          </Link>

          <div className="flex-1 max-w-2xl">
            <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} theme={theme} />
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
            <NavLink to="/favorite" className={({ isActive }) => `p-2 rounded-xl transition-all ${isActive?"bg-white/20":"hover:bg-white/10"}`} title="Wishlist">
              <span className={`material-symbols-outlined text-2xl ${theme.icons}`}>favorite</span>
            </NavLink>

            <NavLink to="/notification" className={({ isActive }) => `relative p-2 rounded-xl transition-all ${isActive?"bg-white/20":"hover:bg-white/10"}`} title="Notifications">
              <span className={`material-symbols-outlined text-2xl ${theme.icons}`}>notifications</span>
              {/* ← Uses context — updates instantly when read */}
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </NavLink>

            <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-xl hover:bg-white/10 transition" title={darkMode?"Light mode":"Dark mode"}>
              <span className={`material-symbols-outlined text-2xl ${theme.icons}`}>{darkMode?"dark_mode":"light_mode"}</span>
            </button>

            {!userName ? (
              <div className="hidden sm:flex items-center gap-2">
                <NavLink to="/login" className="text-white/80 hover:text-white font-semibold text-sm transition">Login</NavLink>
                <NavLink to="/register" className="px-4 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold text-sm transition">Register</NavLink>
              </div>
            ) : (
              <>
                <NavLink to="/profile" className={({ isActive }) => `p-2 rounded-xl transition-all ${isActive?"bg-white/20":"hover:bg-white/10"}`} title="Profile">
                  <span className={`material-symbols-outlined text-2xl ${theme.icons}`}>account_circle</span>
                </NavLink>
                <NavLink to="/logout" className="p-2 rounded-xl hover:bg-white/10 transition" title="Logout">
                  <span className={`material-symbols-outlined text-2xl ${theme.icons}`}>logout</span>
                </NavLink>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}

export default Navbar;