import { createContext, useContext, useState } from "react";
import { validatePassword } from "../services/PasswordValidator";

const AuthContext = createContext(null);

function hashPassword(password) {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

function getUsers() {
  try { return JSON.parse(localStorage.getItem("fv_users") || "{}"); } catch { return {}; }
}

function saveUsers(users) {
  localStorage.setItem("fv_users", JSON.stringify(users));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("fv_session");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [loginError, setLoginError]   = useState("");
  const [pendingUser, setPendingUser] = useState(null);
  const [otpStore, setOtpStore]       = useState({});

  // ── Register ──────────────────────────────────────────────────────
  const register = (name, email, password) => {
    if (!name.trim())         return { ok: false, error: "Enter your name." };
    if (!email.includes("@")) return { ok: false, error: "Enter a valid email." };
    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) {
      return { ok: false, error: "Password must be at least 6 characters and include a number and a special character." };
    }

    const users = getUsers();
    if (users[email.toLowerCase()]) return { ok: false, error: "An account with this email already exists." };

    const newUser = {
      id:           email.toLowerCase(),
      name:         name.trim(),
      email:        email.toLowerCase(),
      avatar:       name.trim().charAt(0).toUpperCase(),
      avatarColor:  "#1254b5",
      passwordHash: hashPassword(password),
      createdAt:    new Date().toISOString(),
    };
    users[email.toLowerCase()] = newUser;
    saveUsers(users);
    return { ok: true };
  };

  // ── Login (step 1) ────────────────────────────────────────────────
  const login = (email, password, rememberMe = false) => {
    const users = getUsers();
    const found = users[email.toLowerCase()];
    if (!found) return { ok: false, error: "No account found with this email." };
    if (found.passwordHash !== hashPassword(password)) return { ok: false, error: "Incorrect password." };

    const safeUser = {
      id:          found.id,
      name:        found.name,
      email:       found.email,
      avatar:      found.avatar,
      avatarColor: found.avatarColor || "#1254b5",
      createdAt:   found.createdAt,
      isAdmin:     found.isAdmin || false,
    };

    // Trusted device — skip 2FA
    const trusted = localStorage.getItem(`fv_trusted_${email.toLowerCase()}`);
    if (trusted === "true") {
      setUser(safeUser);
      localStorage.setItem("fv_session", JSON.stringify(safeUser));
      return { ok: true, needsOtp: false };
    }

    setPendingUser(safeUser);
    return { ok: true, needsOtp: true };
  };

  // ── Send OTP via Resend serverless function ───────────────────────
  const sendOtp = async (email, purpose = "login") => {
    const code    = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000;
    setOtpStore(prev => ({ ...prev, [email.toLowerCase()]: { code, expires, purpose } }));

    const subject = purpose === "login"
      ? "Your Freight Validator login code"
      : "Your Freight Validator password reset code";

    const text = purpose === "login"
      ? `Your 2-step verification code is: ${code}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, ignore this email.`
      : `Your password reset code is: ${code}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, ignore this email.`;

    try {
      const res = await fetch("/api/send-otp", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ to: email, subject, text }),
      });
      if (!res.ok) throw new Error("Server error");
      return { ok: true };
    } catch (err) {
      console.error("OTP send error:", err);
      return { ok: false, error: "Failed to send verification email. Try again." };
    }
  };

  // ── Verify OTP (login 2FA) ────────────────────────────────────────
  const verifyLoginOtp = (email, code, rememberMe) => {
    const entry = otpStore[email.toLowerCase()];
    if (!entry)                     return { ok: false, error: "No OTP found. Request a new code." };
    if (Date.now() > entry.expires) return { ok: false, error: "Code expired. Request a new one." };
    if (entry.code !== code.trim()) return { ok: false, error: "Incorrect code. Try again." };

    setOtpStore(prev => { const n = { ...prev }; delete n[email.toLowerCase()]; return n; });
    setUser(pendingUser);
    setPendingUser(null);

    if (rememberMe) {
      localStorage.setItem("fv_session", JSON.stringify(pendingUser));
      localStorage.setItem(`fv_trusted_${email.toLowerCase()}`, "true");
    }
    return { ok: true };
  };

  // ── Forgot password ───────────────────────────────────────────────
  const verifyResetOtp = (email, code) => {
    const entry = otpStore[email.toLowerCase()];
    if (!entry)                     return { ok: false, error: "No OTP found. Request a new code." };
    if (Date.now() > entry.expires) return { ok: false, error: "Code expired. Request a new one." };
    if (entry.code !== code.trim()) return { ok: false, error: "Incorrect code. Try again." };
    if (entry.purpose !== "reset")  return { ok: false, error: "Invalid code purpose." };
    return { ok: true };
  };

  const resetPassword = (email, code, newPassword) => {
    const verify = verifyResetOtp(email, code);
    if (!verify.ok) return verify;
    if (newPassword.length < 6) return { ok: false, error: "Password must be at least 6 characters." };

    const users = getUsers();
    if (!users[email.toLowerCase()]) return { ok: false, error: "Account not found." };
    users[email.toLowerCase()].passwordHash = hashPassword(newPassword);
    saveUsers(users);
    setOtpStore(prev => { const n = { ...prev }; delete n[email.toLowerCase()]; return n; });
    return { ok: true };
  };

  // ── Update profile ────────────────────────────────────────────────
  const updateProfile = ({ name, avatarColor }) => {
    const users = getUsers();
    if (!users[user.id]) return;
    users[user.id].name        = name;
    users[user.id].avatarColor = avatarColor;
    users[user.id].avatar      = name.charAt(0).toUpperCase();
    saveUsers(users);
    const updated = { ...user, name, avatarColor, avatar: name.charAt(0).toUpperCase() };
    setUser(updated);
    localStorage.setItem("fv_session", JSON.stringify(updated));
  };

  // ── Change password ───────────────────────────────────────────────
  const changePassword = (oldPassword, newPassword) => {
    const users = getUsers();
    if (!users[user.id]) return { ok: false, error: "Account not found." };
    if (users[user.id].passwordHash !== hashPassword(oldPassword)) {
      return { ok: false, error: "Current password is incorrect." };
    }
    users[user.id].passwordHash = hashPassword(newPassword);
    saveUsers(users);
    return { ok: true };
  };

  // ── Logout ────────────────────────────────────────────────────────
  const logout = () => {
    setUser(null);
    setPendingUser(null);
    localStorage.removeItem("fv_session");
  };

  const can = () => !!user;

  return (
    <AuthContext.Provider value={{
      user, pendingUser,
      login, register, logout, can,
      sendOtp, verifyLoginOtp, verifyResetOtp, resetPassword,
      updateProfile, changePassword,
      loginError, setLoginError,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}