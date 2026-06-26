import "./App.css";
import { useState, useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import ProfileSetup from "./pages/ProfileSetup";
import Navbar from "./components/navbar";
import Navbard from "./components/navbard";
import ProductDetails from "./pages/productdetails";
import Home from "./pages/home";
import Login from "./pages/login";
import Register from "./pages/register";
import Logout from "./pages/logout";
import AddItem from "./pages/additem";
import SelectRole from "./pages/select-role";
import ProtectedRoute from "./pages/protectroute";
import NotificationPage from "./pages/notification";
import Profile from "./pages/profile";
import Wishlist from "./pages/favorite";
import Transactions from "./pages/transactions";

function App() {
  const [userName, setUserName] = useState(
    () => localStorage.getItem("username") || ""
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [items, setItems] = useState([]);
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("theme") === "dark"
  );

  useEffect(() => {
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  return (
    <div className={`${darkMode ? "dark" : ""} min-h-screen`}>
      <div
        className={
          darkMode
            ? "bg-gray-950 text-white min-h-screen flex flex-col"
            : "bg-white text-black min-h-screen flex flex-col"
        }
      >
        <Navbar
          userName={userName}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />

        <main className="flex-1 pt-24 pb-24 px-4">
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Home items={items} setItems={setItems} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile-setup"
              element={
                <ProtectedRoute>
                  <ProfileSetup />
                </ProtectedRoute>
              }
            />
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <Home
                    items={items}
                    setItems={setItems}
                    searchTerm={searchTerm}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/login"
              element={<Login setUserName={setUserName} />}
            />
            <Route path="/register" element={<Register />} />
            <Route
              path="/logout"
              element={<Logout setUserName={setUserName} />}
            />
            <Route path="/select-role" element={<SelectRole />} />
            <Route
              path="/productdetail/:id"
              element={
                <ProtectedRoute>
                  <ProductDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/additem"
              element={
                <ProtectedRoute>
                  <AddItem />
                </ProtectedRoute>
              }
            />
            <Route
              path="/favorite"
              element={
                <ProtectedRoute>
                  <Wishlist />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notification"
              element={
                <ProtectedRoute>
                  <NotificationPage />
                </ProtectedRoute>
              }
            />
            {/* ── New: Transactions page ── */}
            <Route
              path="/dashboard/transactions"
              element={
                <ProtectedRoute>
                  <Transactions />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>

        <Navbard
          darkMode={darkMode}
          userName={userName}
          setDarkMode={setDarkMode}
        />
      </div>
    </div>
  );
}

export default App;