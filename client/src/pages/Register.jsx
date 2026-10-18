import { useState } from "react";
import { ArrowLeft, ArrowRight, Brush, Eye, EyeOff, Gamepad2, Layers3, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { getAuthErrorMessage } from "../services/authService.js";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("artist");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError("Please complete all fields.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please check them and try again.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
      });
      navigate("/login", {
        replace: true,
        state: { successMessage: result.message || "Registration successful." },
      });
    } catch (submitError) {
      setError(getAuthErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card auth-card-register">
        <div className="auth-art-panel">
          <Link className="auth-back-link" to="/"><ArrowLeft size={15} /> Back to home</Link>
          <div className="auth-art-copy">
            <span className="auth-art-icon"><Gamepad2 size={21} /></span>
            <span className="eyebrow"><span className="eyebrow-dot" /> MAKE SOMETHING UNFORGETTABLE</span>
            <h2>Find your<br /><span>creative crew.</span></h2>
            <p>Meet the artists and studios turning ambitious ideas into worlds players remember.</p>
          </div>
          <div className="auth-art-highlights">
            <span><Brush size={15} /> Concept &amp; character art</span>
            <span><Layers3 size={15} /> Worlds built in 3D</span>
            <span><Sparkles size={15} /> Independent creative talent</span>
          </div>
        </div>

        <div className="auth-form-panel">
          <div className="auth-form-heading">
            <span className="eyebrow">START SOMETHING NEW</span>
            <h1>Create your account</h1>
            <p>Join a community built around making games.</p>
          </div>
          {error && <div className="form-message form-error" role="alert">{error}</div>}

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="form-field">
              <label htmlFor="register-name">Full name</label>
              <input
                id="register-name"
                name="name"
                type="text"
                autoComplete="name"
                placeholder="Your name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="register-email">Email address</label>
              <input
                id="register-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="register-password">Password</label>
                <input
                  id="register-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={8}
                  required
                />
              </div>
              <div className="form-field">
                <label htmlFor="register-confirm-password">Confirm password</label>
                <div className="password-input-wrap">
                  <input
                    id="register-confirm-password"
                    name="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                  />
                  <button
                    className="password-toggle"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide passwords" : "Show passwords"}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>
            <fieldset className="role-select">
              <legend>I'm joining as</legend>
              <label className={role === "artist" ? "role-option role-selected" : "role-option"}>
                <input type="radio" name="role" value="artist" checked={role === "artist"} onChange={() => setRole("artist")} />
                <Brush size={17} />
                <span><strong>Artist</strong><small>Share your craft</small></span>
              </label>
              <label className={role === "studio" ? "role-option role-selected" : "role-option"}>
                <input type="radio" name="role" value="studio" checked={role === "studio"} onChange={() => setRole("studio")} />
                <Layers3 size={17} />
                <span><strong>Studio</strong><small>Find your talent</small></span>
              </label>
            </fieldset>
            <button className="button button-primary auth-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating account..." : "Create account"} <ArrowRight size={16} />
            </button>
          </form>

          <p className="auth-switch">Already have an account? <Link to="/login">Log in</Link></p>
          <div className="auth-secure-note">Your password is sent securely to the GameArtist Hub server and is never stored in your browser session.</div>
        </div>
      </div>
    </section>
  );
}

export default Register;
