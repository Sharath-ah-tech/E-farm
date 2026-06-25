import { NavLink } from "react-router-dom";
import { getTheme } from "../utils/theme";

function Navbard() {
  const theme = getTheme();

  const navItems = [
    { path: "/home", icon: "home", label: "Home" },
    { path: "/cart", icon: "shopping_cart", label: "Cart" },
    { path: "/additem", icon: "add_box", label: "Add" },
    { path: "/orders", icon: "receipt_long", label: "Orders" },
    { path: "/track", icon: "location_on", label: "Track" },
  ];

  return (
    <footer
      className={`
        fixed bottom-0 left-0 w-full z-50
        ${theme.card}
        ${theme.border}
        border-t
        shadow-2xl
        backdrop-blur-md
      `}
    >
      <nav className="max-w-7xl mx-auto">
        <ul className="flex justify-around items-center py-3">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 transition-all duration-300 ${
                    isActive
                      ? `${theme.icons} ${theme.default} scale-110`
                      : "text-gray-500 dark:text-gray-400 hover:scale-105 hover:text-emerald-500"
                  }`
                }
              >
                <span className="material-symbols-outlined text-3xl">
                  {item.icon}
                </span>

                <span className="text-xs font-medium">
                  {item.label}
                </span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </footer>
  );
}

export default Navbard;