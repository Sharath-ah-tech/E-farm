import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getTheme } from "../utils/theme";
import api from "../api/axios";

function Logout({ setUserName }) {
  const navigate = useNavigate();
  const theme = getTheme();

  useEffect(() => {
    const doLogout = async () => {
      try {
        await api.post("logout/");
      } catch {
        // Ignore API error — still clear local state
      } finally {
        setUserName("");
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        localStorage.removeItem("username");
        localStorage.removeItem("role");
        navigate("/login");
      }
    };
    doLogout();
  }, [setUserName, navigate]);

  return (
    <div
      className={`${theme.page} min-h-screen flex items-center justify-center`}
    >
      <div className="text-center">
        <div
          className={`w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4 ${theme.default}`}
        />
        <p className="text-gray-500 dark:text-gray-400 font-medium">
          Signing out…
        </p>
      </div>
    </div>
  );
}

export default Logout;