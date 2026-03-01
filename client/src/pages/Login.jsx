import { useState } from "react";
import API from "../api/axios";
import king from "../assets/king.png";
import { useNavigate } from "react-router-dom";
import { getRoleFromTokenString } from "../utils/auth";

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

    const normalizedEmail = email.trim().toLowerCase();

    try {
      setLoading(true);

      const res = await API.post("/auth/login", {
        email: normalizedEmail,
        password,
      });

      const token = res?.data?.token;
      if (!token) {
        setError("Login failed. Please try again.");
        return;
      }

      localStorage.setItem("token", token);

      const role = getRoleFromTokenString(token);
      if (!role) {
        localStorage.removeItem("token");
        setError("Login failed. Please try again.");
        return;
      }

      if (role === "OWNER") navigate("/owner");
      else if (role === "SUPERVISOR") navigate("/supervisor");
      else navigate("/guard");
    } catch (err) {
      setError(err?.response?.data?.message || "Authentication failed. Please verify your credentials.");
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
            <img src={king} alt="GuardLink Logo" className="logoImage" />

          </div>
          <h2 id="login-title" className="loginTitle">
            KS<span>L</span>
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
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
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
