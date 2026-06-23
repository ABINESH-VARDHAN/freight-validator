import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

// Everyone who logs in gets full access — no roles anymore.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("fv_user");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [loginError, setLoginError] = useState("");

  const login = (email, password) => {
    if (!email || !email.includes("@")) {
      setLoginError("Enter a valid email address.");
      return false;
    }
    if (!password) {
      setLoginError("Enter your password.");
      return false;
    }
    const name = email.split("@")[0]
      .replace(/[._-]+/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase());
    const safeUser = {
      id: email.toLowerCase(),
      name: name || email,
      email,
      avatar: (name || email).charAt(0).toUpperCase(),
    };
    setUser(safeUser);
    localStorage.setItem("fv_user", JSON.stringify(safeUser));
    setLoginError("");
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("fv_user");
  };

  // Kept so existing call sites (e.g. can("canValidate")) keep working —
  // every logged-in user can do everything now.
  const can = () => !!user;

  return (
    <AuthContext.Provider value={{ user, login, logout, can, loginError, setLoginError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}