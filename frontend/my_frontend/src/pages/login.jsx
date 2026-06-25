import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import api from "../api/axios"

function Login({ setUserName }) {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
  e.preventDefault();

  setLoading(true);
  setError("");

  try {
    const response = await api.post(
      "login/",
      {
        username: name,
        password: password,
      }
    );

    console.log(response.data);

    if (response.status === 200) {

      setUserName(
        response.data.username
      );

      localStorage.setItem(
        "access",
        response.data.access
      );

      localStorage.setItem(
        "refresh",
        response.data.refresh
      );

      localStorage.setItem(
        "username",
        response.data.username
      );

      localStorage.setItem(
        "role",
        response.data.role
      );

      try {

        const profileRes =
          await api.get(
            "/profile/"
          );

        let profile = null;

        if (
          profileRes.data.results
        ) {
          profile =
            profileRes.data.results[0];
        }
        else if (
          Array.isArray(
            profileRes.data
          )
        ) {
          profile =
            profileRes.data[0];
        }
        else {
          profile =
            profileRes.data;
        }

        console.log(
          "PROFILE:",
          profile
        );

        if (!profile?.profile_completed) {
        navigate("/profile-setup");
        } else {
        navigate("/home");
        }

      } catch (profileError) {

        console.log(
          "PROFILE FETCH ERROR:",
          profileError
        );

        navigate("/home");

      }
    }

  } catch (err) {

    console.error(
      "LOGIN ERROR:",
      err
    );

    setError(
      err.response?.data?.error ||
      "Invalid username or password. Please try again."
    );

  } finally {

    setLoading(false);

  }
};
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 p-8 sm:p-10 w-full max-w-md transition-all duration-300">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-3xl mb-4 text-emerald-600">
            🚜
          </div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white">Welcome Back</h2>
          <p className="text-sm text-slate-500 dark:text-slate-300 mt-2">
            Log in to manage your farm orders & purchases
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/30 text-rose-700 dark:text-rose-400 text-sm px-4 py-3 rounded-xl mb-6 flex items-start gap-2">
            <span className="mt-0.5">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Username
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your username"
              className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-black dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl p-3"
              required
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Password
              </label>
              <Link
                to="/forget"
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Forgot?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-black dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl p-3"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-600/10 hover:shadow-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Logging in...
              </>
            ) : (
              "Log In"
            )}
          </button>
        </form>

        {/* Social Logins */}
        <div className="relative my-8 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
          </div>
          <span className="relative bg-white dark:bg-slate-800 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
            Or continue with
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            type="button"
            className="flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-semibold py-2.5 rounded-xl text-sm transition-colors duration-200"
          >
            Google
          </button>
          <button
            type="button"
            className="flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-semibold py-2.5 rounded-xl text-sm transition-colors duration-200"
          >
            Facebook
          </button>
        </div>

        {/* Footer Link */}
        <p className="text-center text-sm text-slate-500 dark:text-slate-300">
          New here?{" "}
          <Link
            to="/register"
            className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Create an Account
          </Link>
        </p>

      </div>
    </div>
  )
}

export default Login
