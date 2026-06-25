import { Link, NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { getTheme } from "../utils/theme";

function Navbar({
  userName,
  darkMode,
  setDarkMode,
  searchTerm,
  setSearchTerm,
}) {
  const [unreadCount, setUnreadCount] = useState(0);

  const theme = getTheme();

  const toggle = () => {
    setDarkMode(!darkMode);
  };

  useEffect(() => {
    const notifications =
      JSON.parse(localStorage.getItem("notifications")) || [];

    const unread = notifications.filter(
      (n) => !n.is_read
    ).length;

    setUnreadCount(unread);
  }, []);

  return (
    <div
  className={`${theme.heading}`}
>
      <nav className="max-w-7xl mx-auto px-6 py-3">
        <ul className="flex items-center justify-between gap-6">

          {/* Logo */}
          <li className="flex items-center gap-3">
            <span className="text-5xl">🚜</span>

            <Link
              to="/home"
              className={`text-3xl font-bold text-white hover:scale-105 transition`}
            >
              E-Farm
            </Link>
          </li>

          {/* Search */}
          <li className="flex-1 max-w-xl">
            <div className="relative">
              <input
                type="text"
                placeholder="Search fresh farm products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`
                  w-full
                  rounded-full
                  px-5
                  py-3
                  pl-12
                  border
                  text-white
                  bg-white
                  dark:bg-slate-800
                  dark:text-white 
                  focus:outline-none
                  focus:ring-2
                  ${theme.ring}
                `}
              />

              <span
                className={`material-symbols-outlined absolute left-4 top-3 ${theme.icons}`}
              >
                search
              </span>
            </div>
          </li>

          {/* Favourite */}
          <li>
            <NavLink
              to="/favorite"
              className={({ isActive }) =>
                `transition duration-300 ${
                  isActive ? "scale-125" : "hover:scale-110"
                }`
              }
            >
              <span
                className={`material-symbols-outlined text-3xl ${theme.icons} hover:scale-110 transition`}
              >
                favorite
              </span>
            </NavLink>
          </li>

          {/* Notifications */}
          <li>
            <NavLink
              to="/notification"
              className={({ isActive }) =>
                `relative transition duration-300 ${
                  isActive ? "scale-125" : "hover:scale-110"
                }`
              }
            >
              <div className="relative">
                <span
                  className={`material-symbols-outlined text-3xl ${theme.icons} hover:scale-110 transition`}
                >
                  notifications
                </span>

                {unreadCount > 0 && (
                  <span
                    className="
                      absolute
                      -top-2
                      -right-2
                      bg-red-500
                      text-white
                      text-xs
                      rounded-full
                      min-w-[18px]
                      h-[18px]
                      flex
                      items-center
                      justify-center
                    "
                  >
                    {unreadCount}
                  </span>
                )}
              </div>
            </NavLink>
          </li>

          {/* Theme Toggle */}
          <li>
            <button
              onClick={toggle}
              className="hover:scale-110 transition"
            >
              <span
                className={`material-symbols-outlined text-3xl ${theme.icons} hover:scale-110 transition`}
              >
                {darkMode ? "dark_mode" : "light_mode"}
              </span>
            </button>
          </li>

          {/* User */}
          {!userName ? (
            <>
              <li>
                <NavLink
                  to="/login"
                  className={({ isActive }) =>
                    `font-semibold transition ${
                      isActive
                        ? theme.text
                        : "text-slate-500 dark:text-slate-300"
                    }`
                  }
                >
                  Login
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/register"
                  className={({ isActive }) =>
                    `px-5 py-2 rounded-full text-white transition ${theme.primary}`
                  }
                >
                  Register
                </NavLink>
              </li>
            </>
          ) : (
            <>
              <li>
                <NavLink
                  to="/profile"
                  className={({ isActive }) =>
                    `transition ${
                      isActive
                        ? "scale-125"
                        : "hover:scale-110"
                    }`
                  }
                >
                  <span
                    className={`material-symbols-outlined text-3xl ${theme.icons}`}
                  >
                    account_circle
                  </span>
                </NavLink>
              </li>

              <li>
                <NavLink
                  to="/logout"
                  className="hover:scale-110 transition"
                >
                  <span
                    className={`material-symbols-outlined text-3xl ${theme.icons}`}
                  >
                    logout
                  </span>
                </NavLink>
              </li>
            </>
          )}
        </ul>
      </nav>
    </div>
  );
}

export default Navbar;