import { useState } from "react";
import { useAuth } from "./AuthContext";

export default function LoginPage() {
  const { login, loginError, setLoginError } = useAuth();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 600)); // small UX delay
    login(email, password);
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Brand */}
        <div className="login-brand">
          <div className="login-logo">FV</div>
          <div>
            <div className="login-app-name">Freight Validator</div>
            <div className="login-app-sub">AI Document Validation</div>
          </div>
        </div>

        <h2 className="login-title">Sign in to your account</h2>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label className="login-label">Email</label>
            <input
              className={`login-input ${loginError ? "error" : ""}`}
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setLoginError(""); }}
              autoComplete="email"
              required
            />
          </div>

          <div className="login-field">
            <label className="login-label">Password</label>
            <div className="login-pass-wrap">
              <input
                className={`login-input ${loginError ? "error" : ""}`}
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={e => { setPassword(e.target.value); setLoginError(""); }}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="pass-toggle"
                onClick={() => setShowPass(!showPass)}
                tabIndex={-1}
              >
                {showPass ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {loginError && (
            <div className="login-error">
              🔴 {loginError}
            </div>
          )}

          <button className="login-submit" type="submit" disabled={loading}>
            {loading ? <><span className="spinner" /> Signing in…</> : "Sign In →"}
          </button>
        </form>
      </div>
    </div>
  );
}