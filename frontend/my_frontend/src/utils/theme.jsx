export const themes = {
  farmer: {
    page: "bg-emerald-50 dark:bg-slate-950",
    card: "bg-white dark:bg-slate-900",
    border: "border-slate-200 dark:border-slate-700",
    primary: "bg-emerald-600 hover:bg-emerald-700",
    secondary: "bg-emerald-100 dark:bg-slate-800",
    text: "text-emerald-700 dark:text-emerald-400",
    title: "from-emerald-300 to-teal-200",
    heading:"bg-gradient-to-t from-slate-800 via-green-700 to-lime-500 \
    dark:bg-gradient-to-t from-slate-800 via-emerald-800 to-green-600",
    icons:"text-white hover:text-lime-400 hover:scale-110 transition",
    ring:"focus:ring-lime-300",
    default:"text-lime-600"
  },

  wholesaler: {
    page: "bg-orange-50 dark:bg-slate-950",
    card: "bg-white dark:bg-slate-900",
    primary: "bg-orange-600 hover:bg-orange-700",
    secondary: "bg-orange-100 dark:bg-slate-800",
    text: "text-orange-700 dark:text-orange-400",
    border: "border-orange-200 dark:border-slate-700",
    title: "from-orange-300 to-yellow-200",
    heading:"bg-gradient-to-t from-slate-800 via-yellow-500 to-amber-400 \
    dark:bg-gradient-to-t from-slate-800 via-yellow-800 to-amber-500",
    icons:"text-white hover:text-yellow-300 hover:scale-110 transition",
    ring:"focus:ring-yellow-300",
    default:"text-yellow-600"
  },

  customer: {
    page: "bg-blue-50 dark:bg-slate-950",
    card: "bg-white dark:bg-slate-900",
    primary: "bg-blue-600 hover:bg-blue-700",
    secondary: "bg-blue-100 dark:bg-slate-800",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-blue-200 dark:border-slate-700",
    title: "from-blue-300 to-cyan-200",
    heading:"bg-gradient-to-t from-slate-800 via-sky-700 to-cyan-500 \
    dark:bg-gradient-to-t from-slate-800 via-sky-800 to-cyan-600",
    icons:"text-white hover:text-cyan-400 hover:scale-110 transition",
    hover:"hover:text-cyan-400 hover:scale-110 transition",
    ring:"focus:ring-cyan-300",
    default:"text-cyan-600"
  },
};

export const getTheme = () => {
  const role =
    localStorage.getItem("role")?.toLowerCase() || "customer";

  return themes[role] || themes.customer;
};