import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type { ResponseState } from "../App";

type LoginPageProps = {
  onLogin: (email: string, password: string) => Promise<void> | void;
  authMessage: ResponseState;
};

export default function LoginPage({ onLogin, authMessage }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onLogin(email, password);
  };

  return (
    <div className="login-page active">
      <div className="login-container">
        <h1>🔐 Welcome back</h1>
        <p>Sign in to continue to your chat.</p>

        <form onSubmit={handleSubmit}>
          <div className="login-form-group">
            <h3>Login</h3>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
            />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
            />
            <button type="submit">Login</button>
          </div>
        </form>

        {authMessage && (
          <div
            className={`response ${authMessage.type === "error" ? "error" : "success"}`}
            style={{ marginTop: 20 }}
          >
            <strong>{authMessage.type === "error" ? "❌ Error:" : "✅ Success:"}</strong>
            <br />
            {authMessage.text}
          </div>
        )}

        <p style={{ marginTop: 20, color: "#414345" }}>
          Need an account? <Link to="/register">Register here</Link>
        </p>
      </div>
    </div>
  );
}
