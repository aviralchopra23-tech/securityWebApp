import { useState } from "react";
import API from "../api/axios";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      setLoading(true);

      const res = await API.post("/auth/login", {
        email,
        password,
      });

      localStorage.setItem("token", res.data.token);

      // Decode JWT payload (existing logic kept)
      const payload = JSON.parse(atob(res.data.token.split(".")[1]));

      if (payload.role === "OWNER") navigate("/owner");
      else if (payload.role === "SUPERVISOR") navigate("/supervisor");
      else navigate("/guard");
    } catch {
      setError("Authentication failed. Please verify your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="loginPage">
      <div className="loginCard" role="dialog" aria-labelledby="login-title">
        {/* Security Header */}
        <div className="securityHeader">
          <div className="securityBadge">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Outer secure ring */}
              <circle cx="12" cy="12" r="9" />

              {/* Access bars */}
              <line x1="9" y1="7" x2="9" y2="17" />
              <line x1="12" y1="9" x2="12" y2="15" />
              <line x1="15" y1="7" x2="15" y2="17" />
            </svg>


          </div>
          <h2 id="login-title" className="loginTitle">
            Guard<span>Link</span>
          </h2>

          <p className="loginSubtitle">
            Secure access to scheduling and workforce management
          </p>
        </div>

        {error && (
          <div className="loginError" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="loginForm" noValidate>
          <div className="formGroup">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div className="formGroup">
            <label htmlFor="password">Password</label>
            <div className="passwordWrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="toggleBtn"
                onClick={() => setShowPassword((v) => !v)}
                disabled={loading}
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="loginBtn"
            disabled={loading || !email || !password}
          >
            {loading ? "Authenticating…" : "Sign In Securely"}
          </button>
        </form>

        <p className="loginFooter">
          🔐 Role-based access control enforced • All actions are audited
        </p>
      </div>
    </div>
  );
}
