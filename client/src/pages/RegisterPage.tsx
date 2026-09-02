import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type { ResponseState } from "../App";

type RegisterPageProps = {
  onRegister: (name: string, email: string, password: string) => Promise<void> | void;
  authMessage: ResponseState;
};

export default function RegisterPage({ onRegister, authMessage }: RegisterPageProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onRegister(name, email, password);
  };

  return (
    <div className="login-page active">
      <div className="login-container">
        <h1>📝 Create account</h1>
        <p>Register to start chatting with the AI.</p>

        <form onSubmit={handleSubmit}>
          <div className="login-form-group">
            <h3>Register</h3>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Full Name"
            />
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
            <button type="submit">Register</button>
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
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  );
}
