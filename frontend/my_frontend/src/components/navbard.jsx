import { NavLink } from "react-router-dom";
import { getTheme } from "../utils/theme";

function Navbard() {
  const theme = getTheme();
  const role = localStorage.getItem("role")?.toLowerCase() || "customer";
  const isSeller = role === "farmer" || role === "wholesaler";

  // Role-based nav items
  const navItems = isSeller
    ? [
        { path: "/home",    icon: "home",           label: "Home"    },
        { path: "/cart",    icon: "shopping_cart",  label: "Cart"    },
        { path: "/additem", icon: "add_box",         label: "Add"     },
        { path: "/orders",  icon: "receipt_long",   label: "Orders"  },
        { path: "/track",   icon: "local_shipping", label: "Track"   },
      ]
    : [
        { path: "/home",      icon: "home",          label: "Home"     },
        { path: "/favorite",  icon: "favorite",      label: "Wishlist" },
        { path: "/cart",      icon: "shopping_cart", label: "Cart"     },
        { path: "/orders",    icon: "receipt_long",  label: "Orders"   },
        { path: "/track",     icon: "local_shipping",label: "Track"    },
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
      <nav className="max-w-7xl mx-auto safe-bottom">
        <ul className="flex justify-around items-center py-2 px-2">
          {navItems.map((item) => (
            <li key={item.path} className="flex-1">
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl transition-all duration-200 ${
                    isActive
                      ? `${theme.text} ${theme.secondary}`
                      : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`material-symbols-outlined text-2xl transition-transform duration-200 ${
                        isActive ? "scale-110" : ""
                      }`}
                      style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      {item.icon}
                    </span>
                    <span className="text-[10px] font-semibold leading-none">
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </footer>
  );
}

export default Navbard;