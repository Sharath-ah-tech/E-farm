import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";

function Register() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("customer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Send post request with username, email, password and role
      const response = await api.post('register/', {
        first_name: firstName,
        last_name:lastName,
        username:name,
        email: email,
        password: password,
        role: role,
      });
      
      if (response.status === 201) {
        localStorage.setItem("register__username", name)
        alert("Registered Successfully");
        navigate('/profile-setup');
        localStorage.setItem('role', response.data.role)
        console.log("Registered")
      }
    } catch (error) {
      console.error(error);
      if (error.response?.data) {
        const errorData = error.response.data;
        // Format object errors nicely
        let errorMsg = "";
        for (const [key, value] of Object.entries(errorData)) {
          errorMsg += `${key}: ${Array.isArray(value) ? value.join(', ') : value}\n`;
        }
        setError(errorMsg || "Registration failed. Please try again.");
      } else {
        setError("Something went wrong!");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 p-8 sm:p-10 w-full max-w-lg transition-all duration-300">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-3xl mb-4 text-emerald-600">
            🌾
          </div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white">Create Account</h2>
          <p className="text-sm text-slate-500 dark:text-slate-300 mt-2">
            Join E-Comm Farmer to start selling or purchasing fresh products
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/30 text-rose-700 dark:text-rose-400 text-sm px-4 py-3 rounded-xl mb-6 whitespace-pre-wrap flex items-start gap-2">
            <span className="mt-0.5">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-black dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl p-3"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-black dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl p-3"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Username
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Choose a unique username"
              className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-black dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl p-3"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-black dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl p-3"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-black dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl p-3"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                I want to register as
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-black dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl p-3"
              >
                <option value="customer">Customer / Buyer</option>
                <option value="farmer">Farmer / Grower</option>
                <option value="wholesaler">Wholesaler</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-600/10 hover:shadow-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <>
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Creating account...
              </>
            ) : (
              "Register"
            )}
          </button>
        </form>

        {/* Footer Link */}
        <p className="text-center text-sm text-slate-500 dark:text-slate-300 mt-8">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Log In
          </Link>
        </p>

      </div>
    </div>
  );
}

export default Register;
