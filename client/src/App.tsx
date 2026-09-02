import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import "./App.css";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ChatPage from "./pages/ChatPage";

export type ResponseState = { type: "success" | "error"; text: string } | null;

const AUTH_BASE = "http://localhost:5000/auth";

function parseJwt(token: string) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(""),
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function isTokenExpired(token: string) {
  try {
    const decoded = parseJwt(token);
    if (!decoded || typeof decoded.exp !== "number") return true;
    return Date.now() >= decoded.exp * 1000;
  } catch {
    return true;
  }
}

function App() {
  const [accessToken, setAccessToken] = useState(
    () => localStorage.getItem("accessToken") ?? "",
  );
  const [, setRefreshToken] = useState(
    () => localStorage.getItem("refreshToken") ?? "",
  );
  const [userName, setUserName] = useState("Not Logged In");
  const [authMessage, setAuthMessage] = useState<ResponseState>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authMessage) return;

    const timer = window.setTimeout(() => {
      setAuthMessage(null);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [authMessage]);

  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setAccessToken("");
    setRefreshToken("");
    setUserName("Not Logged In");
    setAuthMessage({ type: "success", text: "Logged out successfully" });
    navigate("/login");
  };

  useEffect(() => {
    if (!accessToken) {
      setUserName("Not Logged In");
      return;
    }

    const updateTimer = () => {
      const decoded = parseJwt(accessToken);
      if (!decoded || typeof decoded.exp !== "number") {
        logout();
        return;
      }

      const remaining = decoded.exp * 1000 - Date.now();
      if (remaining <= 0) {
        logout();
      }
    };

    updateTimer();
    const interval = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(interval);
  }, [accessToken]);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token && !isTokenExpired(token)) {
      const decoded = parseJwt(token);
      if (decoded && decoded.name) {
        setAccessToken(token);
        setRefreshToken(localStorage.getItem("refreshToken") ?? "");
        setUserName(decoded.name);
      }
    }
  }, []);

  const handleRegister = async (name: string, email: string, password: string) => {
    if (!name || !email || !password) {
      setAuthMessage({ type: "error", text: "All fields are required" });
      return;
    }

    try {
      const response = await fetch(`${AUTH_BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("accessToken", data.token);
        localStorage.setItem("refreshToken", data.refreshToken);
        setAccessToken(data.token);
        setRefreshToken(data.refreshToken);
        setUserName(data.user.name);
        setAuthMessage({
          type: "success",
          text: `User registered! ID: ${data.user.id}`,
        });
        navigate("/chat");
      } else {
        setAuthMessage({
          type: "error",
          text: data.message ?? "Register failed",
        });
      }
    } catch (error) {
      setAuthMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Registration failed",
      });
    }
  };

  const handleLogin = async (email: string, password: string) => {
    if (!email || !password) {
      setAuthMessage({
        type: "error",
        text: "Email and password are required",
      });
      return;
    }

    try {
      const response = await fetch(`${AUTH_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("accessToken", data.token);
        localStorage.setItem("refreshToken", data.refreshToken);
        setAccessToken(data.token);
        setRefreshToken(data.refreshToken);
        setUserName(data.user.name);
        setAuthMessage({
          type: "success",
          text: `Welcome ${data.user.name}! ID: ${data.user.id}`,
        });
        navigate("/chat");
      } else {
        setAuthMessage({
          type: "error",
          text: data.message ?? "Login failed",
        });
      }
    } catch (error) {
      setAuthMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Login failed",
      });
    }
  };

  const isAuthenticated = Boolean(accessToken) && !isTokenExpired(accessToken);

  return (
    <Routes>
      <Route path="/" element={<Navigate to={isAuthenticated ? "/chat" : "/login"} replace />} />
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to="/chat" replace />
          ) : (
            <LoginPage onLogin={handleLogin} authMessage={authMessage} />
          )
        }
      />
      <Route
        path="/register"
        element={
          isAuthenticated ? (
            <Navigate to="/chat" replace />
          ) : (
            <RegisterPage onRegister={handleRegister} authMessage={authMessage} />
          )
        }
      />
      <Route
        path="/chat"
        element={
          isAuthenticated ? (
            <ChatPage accessToken={accessToken} userName={userName} onLogout={logout} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

export default App;
