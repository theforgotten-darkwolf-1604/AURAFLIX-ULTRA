import { useState } from "react";
import "./Auth.css";

const API_BASE = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");


async function handleSubmit(event) {
event.preventDefault();
setError("");
if (!email.trim() || !password) {
  setError("Please enter your email and password.");
  return;
}

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  setError("Please enter a valid email address.");
  return;
}

if (password.length < 8) {
  setError("Your password must contain at least 8 characters.");
  return;
}

if (mode === "signup") {
  if (!name.trim()) {
    setError("Please enter your name.");
    return;
  }

  if (password !== confirmPassword) {
    setError("Your passwords do not match.");
    return;
  }
}

try {
  const endpoint =
    mode === "signup"
      ? API_BASE + "/auth/register"
      : API_BASE + "/auth/login";

  const payload =
    mode === "signup"
      ? {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        }
      : {
          email: email.trim().toLowerCase(),
          password,
        };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!response.ok) {
    const detail = result.detail;
    throw new Error(
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((item) => item.msg).join(" ")
          : "Authentication failed. Please try again."
    );
  }

  let authenticatedUser;

  if (mode === "signup") {
    // Registration creates the account. Sign in automatically afterward.
    const loginResponse = await fetch(
      API_BASE + "/auth/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      }
    );

    const loginResult = await loginResponse.json();

    if (!loginResponse.ok) {
      throw new Error(
        loginResult.detail || "Account created. Please sign in."
      );
    }

    authenticatedUser = loginResult.user;

    sessionStorage.setItem(
      "auraflix_access_token",
      loginResult.access_token
    );
  } else {
    authenticatedUser = result.user;

    sessionStorage.setItem(
      "auraflix_access_token",
      result.access_token
    );
  }

  onLogin(authenticatedUser.name);
} catch (error) {
  setError(
    error.message ||
      "Cannot connect to AURAFLIX. Make sure the backend is running."
  );
}

}


  return (
    <main className="auth-screen">
      <div className="auth-orb auth-orb-one" />
      <div className="auth-orb auth-orb-two" />

      <section className="auth-card">
        <div className="auth-brand">
          <span className="auth-brand-icon">âœ§</span>
          AURA<span>FLIX</span>
          <sup>ULTRA</sup>
        </div>

        <div className="auth-eyebrow">
          <span /> YOUR NEXT UNIVERSE AWAITS
        </div>

        <h1>
          {mode === "signup" ? (
            <>
              Enter your
              <br />
              <span>own universe.</span>
            </>
          ) : (
            <>
              Welcome
              <br />
              <span>back, explorer.</span>
            </>
          )}
        </h1>

        <p className="auth-subtitle">
          {mode === "signup"
            ? "Create your space among extraordinary stories."
            : "Your next cinematic adventure is waiting."}
        </p>

        <div className="auth-tabs">
          <button
            className={mode === "login" ? "active" : ""}
            onClick={() => {
              setMode("login");
              setError("");
            }}
            type="button"
          >
            Sign In
          </button>

          <button
            className={mode === "signup" ? "active" : ""}
            onClick={() => {
              setMode("signup");
              setError("");
            }}
            type="button"
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === "signup" && (
            <label>
              YOUR NAME
              <input
                type="text"
                placeholder="What should we call you?"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                required
              />
            </label>
          )}

          <label>
            EMAIL ADDRESS
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label>
            PASSWORD
            <div className="auth-password">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="At least 8 characters"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "HIDE" : "SHOW"}
              </button>
            </div>
          </label>

          {mode === "signup" && (
            <label>
              CONFIRM PASSWORD
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password again"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                autoComplete="new-password"
                required
              />
            </label>
          )}

          {error && <p className="auth-error">{error}</p>}

          <button className="auth-submit" type="submit">
            {mode === "signup"
              ? "CREATE YOUR UNIVERSE  â†—"
              : "ENTER AURAFLIX  â†—"}
          </button>
        </form>

        <div className="auth-divider">
          <span />
          <span>YOUR STORY STARTS HERE</span>
          <span />
        </div>

        <p className="auth-legal">
          By continuing, you agree to use AURAFLIX responsibly.
        </p>
      </section>

      <div className="auth-footer">
        FEEL THE STORY. LIVE THE AURA.
      </div>
    </main>
  );
}
