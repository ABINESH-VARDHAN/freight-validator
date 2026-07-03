import { useState } from "react";
import { useAuth } from "./AuthContext";

/* ─── Password checklist helper ──────────────────────────────────── */
function PasswordChecklist({ password }) {
  const rules = [
    { label: "At least 6 characters",                        pass: password.length >= 6 },
    { label: "At least one number",                          pass: /\d/.test(password) },
    { label: "At least one special character (@#$%!&*etc)",  pass: /[^A-Za-z0-9]/.test(password) },
  ];
  if (!password) return null;
  return (
    <ul className="pass-checklist">
      {rules.map((r, i) => (
        <li key={i} className={r.pass ? "check-pass" : "check-fail"}>
          <span className="check-icon">{r.pass ? "✅" : "❌"}</span>
          <span>{r.label}</span>
        </li>
      ))}
    </ul>
  );
}

/* ─── Screens: "login" | "register" | "otp" | "forgot" ── */
export default function LoginPage() {
  const { login, register, sendOtp, verifyLoginOtp, resetPassword } = useAuth();
  const [screen, setScreen] = useState("login");

  // login fields
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPass, setShowPass]     = useState(false);

  // register fields
  const [regName, setRegName]         = useState("");
  const [regEmail, setRegEmail]       = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm]   = useState("");
  const [showRegPass, setShowRegPass] = useState(false);

  // OTP
  const [otp, setOtp]           = useState("");
  const [otpEmail, setOtpEmail] = useState("");

  // forgot / reset
  const [forgotEmail, setForgotEmail]         = useState("");
  const [resetOtp, setResetOtp]               = useState("");
  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPass, setShowNewPass]         = useState(false);
  const [resetStep, setResetStep]             = useState(1);

  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const clearMessages = () => { setError(""); setSuccess(""); };

  const passValid = (p) =>
    p.length >= 6 && /\d/.test(p) && /[^A-Za-z0-9]/.test(p);

  // ── Login ─────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault(); clearMessages(); setLoading(true);
    const result = login(email, password);
    if (!result.ok) { setError(result.error); setLoading(false); return; }
    setOtpEmail(email);
    const sent = await sendOtp(email, "login");
    setLoading(false);
    if (!sent.ok) { setError(sent.error); return; }
    setSuccess("A 6-digit code has been sent to your email.");
    setScreen("otp");
  };

  // ── OTP ───────────────────────────────────────────────────────────
  const handleOtp = (e) => {
    e.preventDefault(); clearMessages();
    const result = verifyLoginOtp(otpEmail, otp, rememberMe);
    if (!result.ok) setError(result.error);
  };

  const handleResendOtp = async () => {
    clearMessages(); setLoading(true);
    const sent = await sendOtp(otpEmail, "login");
    setLoading(false);
    if (!sent.ok) setError(sent.error);
    else setSuccess("New code sent to your email.");
  };

  // ── Register ──────────────────────────────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault(); clearMessages();
    if (!passValid(regPassword)) { setError("Password doesn't meet all requirements."); return; }
    if (regPassword !== regConfirm) { setError("Passwords do not match."); return; }
    const result = register(regName, regEmail, regPassword);
    if (!result.ok) { setError(result.error); return; }
    setLoading(true);
    login(regEmail, regPassword);
    setOtpEmail(regEmail);
    const sent = await sendOtp(regEmail, "login");
    setLoading(false);
    if (!sent.ok) { setError(sent.error); return; }
    setSuccess("Account created! A 6-digit code has been sent to your email.");
    setScreen("otp");
  };

  // ── Forgot ────────────────────────────────────────────────────────
  const handleForgotSend = async (e) => {
    e.preventDefault(); clearMessages();
    if (!forgotEmail.includes("@")) { setError("Enter a valid email."); return; }
    setLoading(true);
    const sent = await sendOtp(forgotEmail, "reset");
    setLoading(false);
    if (!sent.ok) { setError(sent.error); return; }
    setSuccess("Reset code sent to your email.");
    setResetStep(2);
  };

  const handleResetPassword = (e) => {
    e.preventDefault(); clearMessages();
    if (!passValid(newPassword)) { setError("Password doesn't meet all requirements."); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
    const result = resetPassword(forgotEmail, resetOtp, newPassword);
    if (!result.ok) { setError(result.error); return; }
    setSuccess("Password reset successfully! You can now log in.");
    setTimeout(() => { setScreen("login"); setResetStep(1); clearMessages(); }, 2000);
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

        {/* ── LOGIN ── */}
        {screen === "login" && (
          <>
            <h2 className="login-title">Sign in to your account</h2>
            <form className="login-form" onSubmit={handleLogin}>
              <div className="login-field">
                <label className="login-label">Email</label>
                <input className={`login-input ${error?"error":""}`} type="email"
                  placeholder="you@company.com" value={email} autoComplete="email" required
                  onChange={e=>{setEmail(e.target.value);clearMessages();}}/>
              </div>
              <div className="login-field">
                <label className="login-label">Password</label>
                <div className="login-pass-wrap">
                  <input className={`login-input ${error?"error":""}`}
                    type={showPass?"text":"password"} placeholder="••••••••"
                    value={password} autoComplete="current-password" required
                    onChange={e=>{setPassword(e.target.value);clearMessages();}}/>
                  <button type="button" className="pass-toggle" tabIndex={-1}
                    onClick={()=>setShowPass(!showPass)}>
                    {showPass?"Hide":"Show"}
                  </button>
                </div>
              </div>
              <div className="login-row">
                <label className="login-remember">
                  <input type="checkbox" checked={rememberMe}
                    onChange={e=>setRememberMe(e.target.checked)}/>
                  <span>Remember me</span>
                </label>
                <button type="button" className="login-link"
                  onClick={()=>{setScreen("forgot");clearMessages();}}>
                  Forgot password?
                </button>
              </div>
              {error   && <div className="login-error">🔴 {error}</div>}
              {success && <div className="login-success">✅ {success}</div>}
              <button className="login-submit" type="submit" disabled={loading}>
                {loading?<><span className="spinner"/> Signing in…</>:"Sign In →"}
              </button>
            </form>
            <div className="login-switch">
              Don't have an account?{" "}
              <button className="login-link" onClick={()=>{setScreen("register");clearMessages();}}>
                Create one
              </button>
            </div>
          </>
        )}

        {/* ── OTP ── */}
        {screen === "otp" && (
          <>
            <h2 className="login-title">2-Step Verification</h2>
            <p className="login-sub">Enter the 6-digit code sent to <strong>{otpEmail}</strong></p>
            <form className="login-form" onSubmit={handleOtp}>
              <div className="login-field">
                <label className="login-label">Verification Code</label>
                <input className={`login-input otp-input ${error?"error":""}`}
                  type="text" inputMode="numeric" maxLength={6}
                  placeholder="000000" value={otp}
                  onChange={e=>{setOtp(e.target.value.replace(/\D/g,""));clearMessages();}}/>
              </div>
              {error   && <div className="login-error">🔴 {error}</div>}
              {success && <div className="login-success">✅ {success}</div>}
              <button className="login-submit" type="submit" disabled={otp.length!==6}>
                Verify & Sign In →
              </button>
              <div className="login-otp-actions">
                <button type="button" className="login-link" onClick={handleResendOtp} disabled={loading}>
                  {loading?"Sending…":"Resend code"}
                </button>
                <button type="button" className="login-link"
                  onClick={()=>{setScreen("login");setOtp("");clearMessages();}}>
                  ← Back to login
                </button>
              </div>
            </form>
          </>
        )}

        {/* ── REGISTER ── */}
        {screen === "register" && (
          <>
            <h2 className="login-title">Create your account</h2>
            <form className="login-form" onSubmit={handleRegister}>
              <div className="login-field">
                <label className="login-label">Full Name</label>
                <input className={`login-input ${error?"error":""}`} type="text"
                  placeholder="John Smith" value={regName} required
                  onChange={e=>{setRegName(e.target.value);clearMessages();}}/>
              </div>
              <div className="login-field">
                <label className="login-label">Email</label>
                <input className={`login-input ${error?"error":""}`} type="email"
                  placeholder="you@company.com" value={regEmail} required
                  onChange={e=>{setRegEmail(e.target.value);clearMessages();}}/>
              </div>
              <div className="login-field">
                <label className="login-label">Password</label>
                <div className="login-pass-wrap">
                  <input className={`login-input ${error?"error":""}`}
                    type={showRegPass?"text":"password"} placeholder="Min. 6 characters"
                    value={regPassword} required
                    onChange={e=>{setRegPassword(e.target.value);clearMessages();}}/>
                  <button type="button" className="pass-toggle" tabIndex={-1}
                    onClick={()=>setShowRegPass(!showRegPass)}>
                    {showRegPass?"Hide":"Show"}
                  </button>
                </div>
                <PasswordChecklist password={regPassword}/>
              </div>
              <div className="login-field">
                <label className="login-label">Confirm Password</label>
                <input className={`login-input ${error?"error":""}`}
                  type="password" placeholder="Repeat password"
                  value={regConfirm} required
                  onChange={e=>{setRegConfirm(e.target.value);clearMessages();}}/>
                {regConfirm && regPassword!==regConfirm && <p className="pass-match-error">❌ Passwords do not match</p>}
                {regConfirm && regPassword===regConfirm  && <p className="pass-match-ok">✅ Passwords match</p>}
              </div>
              {error   && <div className="login-error">🔴 {error}</div>}
              {success && <div className="login-success">✅ {success}</div>}
              <button className="login-submit" type="submit"
                disabled={loading||!passValid(regPassword)||regPassword!==regConfirm}>
                {loading?<><span className="spinner"/> Creating account…</>:"Create Account →"}
              </button>
            </form>
            <div className="login-switch">
              Already have an account?{" "}
              <button className="login-link" onClick={()=>{setScreen("login");clearMessages();}}>
                Sign in
              </button>
            </div>
          </>
        )}

        {/* ── FORGOT / RESET ── */}
        {screen === "forgot" && (
          <>
            <h2 className="login-title">
              {resetStep===1?"Reset your password":"Enter reset code"}
            </h2>

            {resetStep===1 && (
              <form className="login-form" onSubmit={handleForgotSend}>
                <p className="login-sub">Enter your email and we'll send you a reset code.</p>
                <div className="login-field">
                  <label className="login-label">Email</label>
                  <input className={`login-input ${error?"error":""}`} type="email"
                    placeholder="you@company.com" value={forgotEmail} required
                    onChange={e=>{setForgotEmail(e.target.value);clearMessages();}}/>
                </div>
                {error   && <div className="login-error">🔴 {error}</div>}
                {success && <div className="login-success">✅ {success}</div>}
                <button className="login-submit" type="submit" disabled={loading}>
                  {loading?<><span className="spinner"/> Sending…</>:"Send Reset Code →"}
                </button>
                <div className="login-switch">
                  <button className="login-link" onClick={()=>{setScreen("login");clearMessages();}}>
                    ← Back to login
                  </button>
                </div>
              </form>
            )}

            {resetStep===2 && (
              <form className="login-form" onSubmit={handleResetPassword}>
                <p className="login-sub">Enter the code sent to <strong>{forgotEmail}</strong> and your new password.</p>
                <div className="login-field">
                  <label className="login-label">Reset Code</label>
                  <input className={`login-input otp-input ${error?"error":""}`}
                    type="text" inputMode="numeric" maxLength={6}
                    placeholder="000000" value={resetOtp}
                    onChange={e=>{setResetOtp(e.target.value.replace(/\D/g,""));clearMessages();}}/>
                </div>
                <div className="login-field">
                  <label className="login-label">New Password</label>
                  <div className="login-pass-wrap">
                    <input className={`login-input ${error?"error":""}`}
                      type={showNewPass?"text":"password"} placeholder="Min. 6 characters"
                      value={newPassword} required
                      onChange={e=>{setNewPassword(e.target.value);clearMessages();}}/>
                    <button type="button" className="pass-toggle" tabIndex={-1}
                      onClick={()=>setShowNewPass(!showNewPass)}>
                      {showNewPass?"Hide":"Show"}
                    </button>
                  </div>
                  <PasswordChecklist password={newPassword}/>
                </div>
                <div className="login-field">
                  <label className="login-label">Confirm New Password</label>
                  <input className={`login-input ${error?"error":""}`}
                    type="password" placeholder="Repeat new password"
                    value={confirmPassword} required
                    onChange={e=>{setConfirmPassword(e.target.value);clearMessages();}}/>
                  {confirmPassword && newPassword!==confirmPassword && <p className="pass-match-error">❌ Passwords do not match</p>}
                  {confirmPassword && newPassword===confirmPassword  && <p className="pass-match-ok">✅ Passwords match</p>}
                </div>
                {error   && <div className="login-error">🔴 {error}</div>}
                {success && <div className="login-success">✅ {success}</div>}
                <button className="login-submit" type="submit"
                  disabled={resetOtp.length!==6||!passValid(newPassword)||newPassword!==confirmPassword}>
                  Reset Password →
                </button>
                <div className="login-otp-actions">
                  <button type="button" className="login-link"
                    onClick={async()=>{
                      clearMessages();setLoading(true);
                      const sent=await sendOtp(forgotEmail,"reset");
                      setLoading(false);
                      if(!sent.ok)setError(sent.error);else setSuccess("New code sent.");
                    }} disabled={loading}>
                    Resend code
                  </button>
                  <button type="button" className="login-link"
                    onClick={()=>{setResetStep(1);clearMessages();}}>
                    ← Change email
                  </button>
                </div>
              </form>
            )}
          </>
        )}

      </div>
    </div>
  );
}