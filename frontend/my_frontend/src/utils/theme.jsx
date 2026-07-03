export const themes = {
  farmer: {
    // ── LIGHT (updated) ──
    page: "bg-lime-50 dark:bg-slate-950",
    card: "bg-white dark:bg-slate-900",
    border: "border-emerald-200 dark:border-emerald-700",
    primary: "bg-emerald-600 hover:bg-emerald-700",
    secondary: "bg-emerald-50 dark:bg-slate-800",
    text: "text-emerald-800 dark:text-emerald-400",
    title: "from-emerald-400 to-lime-300",
    heading:"bg-gradient-to-t from-slate-800 via-green-700 to-lime-500 \
    dark:bg-gradient-to-t from-slate-800 via-emerald-800 to-green-600",
    icons:"text-white hover:text-lime-400 hover:scale-110 transition",
    ring:"focus:ring-emerald-300",
    default:"text-emerald-600"
  },

  wholesaler: {
    // ── LIGHT (updated) ──
    page: "bg-amber-50 dark:bg-slate-950",
    card: "bg-white dark:bg-slate-900",
    primary: "bg-orange-600 hover:bg-orange-700",
    secondary: "bg-orange-50 dark:bg-slate-800",
    text: "text-orange-800 dark:text-orange-400",
    border: "border-orange-200 dark:border-slate-700",
    title: "from-orange-400 to-amber-300",
    heading:"bg-gradient-to-t from-slate-800 via-yellow-500 to-amber-400 \
    dark:bg-gradient-to-t from-slate-800 via-yellow-800 to-amber-500",
    icons:"text-white hover:text-yellow-300 hover:scale-110 transition",
    ring:"focus:ring-orange-300",
    default:"text-orange-600"
  },

  customer: {
    // ── LIGHT (updated) ──
    page: "bg-sky-50 dark:bg-slate-950",
    card: "bg-white dark:bg-slate-900",
    primary: "bg-blue-600 hover:bg-blue-700",
    secondary: "bg-sky-50 dark:bg-slate-800",
    text: "text-blue-800 dark:text-blue-400",
    border: "border-sky-200 dark:border-slate-700",
    title: "from-sky-400 to-cyan-300",
    heading:"bg-gradient-to-t from-slate-800 via-sky-700 to-cyan-500 \
    dark:bg-gradient-to-t from-slate-800 via-sky-800 to-cyan-600",
    icons:"text-white hover:text-cyan-400 hover:scale-110 transition",
    hover:"hover:text-cyan-400 hover:scale-110 transition",
    ring:"focus:ring-sky-300",
    default:"text-sky-600"
  },
};

export const getTheme = () => {
  const role =
    localStorage.getItem("role")?.toLowerCase() || "customer";

  return themes[role] || themes.customer;
};