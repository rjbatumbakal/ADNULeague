import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../services/supabaseClient";

function AdminLogin() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (session) {
    return <Navigate to="/adnu-admin-portal" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    navigate("/adnu-admin-portal");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-theme-bg px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-theme-border bg-theme-surface-strong p-8 shadow-panel">
        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-brand-gold">
          Admin Access
        </p>
        <h1 className="mt-3 text-3xl font-bold text-theme-text">
          Sign in to the ADNLS3 dashboard
        </h1>
        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-theme-muted"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border border-theme-border-soft bg-theme-bg px-4 py-3 text-theme-text outline-none transition focus:border-brand-gold"
              placeholder="admin@adnu.edu.ph"
              required
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-theme-muted"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-theme-border-soft bg-theme-bg px-4 py-3 text-theme-text outline-none transition focus:border-brand-gold"
              placeholder="Enter your password"
              required
            />
          </div>
          {error ? (
            <div className="rounded-2xl border border-[#F43F5E4D] bg-[#F43F5E1A] px-4 py-3">
              <p className="text-sm text-[#FDA4AF]">{error}</p>
            </div>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-brand-gold px-4 py-3 text-white font-semibold text-theme-contrast transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-[#64748B]">
          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
              clipRule="evenodd"
            />
          </svg>
          <span>Protected by Supabase Auth</span>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;
