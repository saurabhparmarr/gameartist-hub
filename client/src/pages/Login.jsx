import { useState } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Gamepad2, Sparkles } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { getAuthErrorMessage, getDashboardPath } from "../services/authService.js";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const successMessage = location.state?.successMessage;

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const user = await login({ email: email.trim(), password });
      const requestedPath = location.state?.from?.pathname;
      const dashboardPath = getDashboardPath(user.role);
      const isDashboardPath = requestedPath === dashboardPath;
      const isArtistProfilePath = requestedPath?.startsWith("/artists/");
      const destination = isDashboardPath || isArtistProfilePath ? requestedPath : dashboardPath;
      navigate(destination, { replace: true });
    } catch (submitError) {
      setError(getAuthErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <div className="auth-art-panel">
          <Link className="auth-back-link" to="/"><ArrowLeft size={15} /> Back to home</Link>
          <div className="auth-art-copy">
            <span className="auth-art-icon"><Gamepad2 size={21} /></span>
            <span className="eyebrow"><span className="eyebrow-dot" /> YOUR CREATIVE WORLD AWAITS</span>
            <h2>Good to have<br />you <span>back.</span></h2>
            <p>Pick up where the next great game world begins: with the people who imagine it.</p>
          </div>
          <div className="auth-art-credit"><Sparkles size={14} /> A home for game art &amp; creative minds</div>
        </div>

        <div className="auth-form-panel">
          <div className="auth-form-heading">
            <span className="eyebrow">WELCOME BACK</span>
            <h1>Log in to your account</h1>
            <p>Good things happen when creative people connect.</p>
          </div>

          {successMessage && <div className="form-message form-success" role="status">{successMessage} You can log in now.</div>}
          {error && <div className="form-message form-error" role="alert">{error}</div>}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <label htmlFor="login-email">Email address</label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="login-password">Password</label>
              <div className="password-input-wrap">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>
            <button className="button button-primary auth-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Logging in..." : "Log in"} <ArrowRight size={16} />
            </button>
          </form>

          <p className="auth-switch">New to GameArtist Hub? <Link to="/register">Create an account</Link></p>
          <div className="auth-secure-note">Your password is never saved on this device.</div>
        </div>
      </div>
    </section>
  );
}

export default Login;
