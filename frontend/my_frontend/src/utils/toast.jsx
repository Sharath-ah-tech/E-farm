import { createContext, useContext, useState, useCallback, useEffect } from "react";

const ToastCtx = createContext({ show: () => {} });

const ICONS = {
  success: "check_circle",
  error:   "error",
  info:    "info",
  warning: "warning",
};
const BG = {
  success: "from-green-500  to-emerald-600",
  error:   "from-red-500    to-rose-600",
  info:    "from-blue-500   to-indigo-600",
  warning: "from-yellow-500 to-amber-600",
};

function ToastItem({ id, message, type = "info", onRemove }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setShow(true),   10);
    const t2 = setTimeout(() => setShow(false), 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl
        text-white text-sm font-medium w-full max-w-sm
        bg-gradient-to-r ${BG[type] || BG.info}
        transition-all duration-300
        ${show ? "opacity-100 translate-x-0" : "opacity-0 translate-x-12"}
      `}
    >
      <span className="material-symbols-outlined text-xl flex-shrink-0">
        {ICONS[type] || "info"}
      </span>
      <p className="flex-1 leading-snug">{message}</p>
      <button
        onClick={() => onRemove(id)}
        className="flex-shrink-0 hover:opacity-70 transition active:scale-90"
      >
        <span className="material-symbols-outlined text-base">close</span>
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((message, type = "info", duration = 3600) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), duration);
  }, []);

  const remove = useCallback((id) => {
    setToasts((p) => p.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      {/* Bottom-right stack, above the bottom nav */}
      <div className="fixed bottom-24 right-4 z-[300] flex flex-col gap-2 items-end pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto w-full max-w-sm">
            <ToastItem {...t} onRemove={remove} />
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);