import { useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { getAuthErrorMessage } from "../services/authService.js";

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, isAuthenticated, login, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (isAuthenticated && user.role === "admin") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const loggedInUser = await login({ email: email.trim(), password });
      if (loggedInUser.role !== "admin") {
        logout();
        setError("This account does not have administrator access.");
        return;
      }
      navigate(location.state?.from?.pathname || "/admin/dashboard", {
        replace: true,
      });
    } catch (submitError) {
      setError(getAuthErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isAuthenticated) {
    return (
      <main className="admin-login-page">
        <section className="admin-login-card">
          <span className="admin-login-mark"><ShieldCheck size={23} /></span>
          <p className="eyebrow">ADMINISTRATOR SIGN IN</p>
          <h1>Admin access required</h1>
          <p>Sign out of your current account before signing in as an administrator.</p>
          <button className="button button-primary" type="button" onClick={logout}>
            Sign out
          </button>
          <Link to="/">Return to GameArtist Hub</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <Link className="admin-login-home" to="/">← GameArtist Hub</Link>
        <span className="admin-login-mark"><ShieldCheck size={23} /></span>
        <p className="eyebrow">SECURE ADMINISTRATOR ACCESS</p>
        <h1>Welcome back.</h1>
        <p>Sign in with your provisioned administrator account.</p>
        {error && <div className="form-message form-error" role="alert">{error}</div>}
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="admin-email">Email address</label>
            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          <button className="button button-primary auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"} <ArrowRight size={16} />
          </button>
        </form>
        <p className="admin-login-footnote">Admin accounts can only be created by a server operator.</p>
      </section>
    </main>
  );
}

export default AdminLogin;
