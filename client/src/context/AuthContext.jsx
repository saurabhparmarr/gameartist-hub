import { createContext, useContext, useState } from "react";
import { AUTH_STORAGE_KEY } from "../services/api.js";
import { loginAccount, registerAccount } from "../services/authService.js";

const AuthContext = createContext(null);

function readSavedSession() {
  const savedSession = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!savedSession) return { token: null, user: null };

  try {
    const session = JSON.parse(savedSession);
    const validUser =
      session.user &&
      typeof session.user.id === "string" &&
      typeof session.user.name === "string" &&
      typeof session.user.email === "string" &&
      ["artist", "studio"].includes(session.user.role);

    if (typeof session.token === "string" && session.token && validUser) {
      return { token: session.token, user: session.user };
    }
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return { token: null, user: null };
  }

  localStorage.removeItem(AUTH_STORAGE_KEY);
  return { token: null, user: null };
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readSavedSession);
  const isAuthenticated = Boolean(session.token && session.user);

  async function login(credentials) {
    const loggedInSession = await loginAccount(credentials);
    const savedSession = JSON.stringify(loggedInSession);

    try {
      localStorage.setItem(AUTH_STORAGE_KEY, savedSession);
    } catch {
      throw new Error("Login succeeded, but this browser could not save your session. Check your browser storage settings.");
    }

    setSession(loggedInSession);
    return loggedInSession.user;
  }

  async function register(account) {
    return registerAccount(account);
  }

  function logout() {
    setSession({ token: null, user: null });
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }

  return (
    <AuthContext.Provider
      value={{
        user: session.user,
        token: session.token,
        isAuthenticated,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider.");
  }
  return context;
}
