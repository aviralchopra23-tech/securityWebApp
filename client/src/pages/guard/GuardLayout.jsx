import { Outlet, NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { logout } from "../../utils/logout";
import api from "../../api/axios";


export default function GuardLayout() {
  const [payPeriodLocked, setPayPeriodLocked] = useState(false);
  const [guardName, setGuardName] = useState("");
  const [role, setRole] = useState("GUARD");
  const location = useLocation();

  useEffect(() => {
    setPayPeriodLocked(
      sessionStorage.getItem("guardPayPeriodSubmitted") === "true"
    );
  }, [location.pathname]);

  // ✅ SAFE: backend is source of truth
  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await api.get("/auth/me");
        setGuardName(res.data.firstName);
        setRole(res.data.role);
      } catch {
        setGuardName("Guard");
        setRole("GUARD");
      }
    };

    loadUser();
  }, []);

  return (
    <div className="layout">
      <aside className="sidebar">
        {/* ===== BRAND HEADER ===== */}
        <div className="sidebar-header">
          <div className="brand-logo">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <line x1="9" y1="7" x2="9" y2="17" />
              <line x1="12" y1="9" x2="12" y2="15" />
              <line x1="15" y1="7" x2="15" y2="17" />
            </svg>
          </div>

          <div className="brand-text">
            <span className="brand-name">{guardName}</span>

            {/* ✅ ROLE BADGE */}
            <span className="brand-role role-badge">
              {role}
            </span>
          </div>
        </div>

        {/* ===== NAV ===== */}
        <nav className="nav">
          <NavLink to="/guard" end className="nav-link">
            Home
          </NavLink>

          <NavLink to="/guard/schedule" className="nav-link">
            Schedule
          </NavLink>

          <NavLink to="/guard/pay-periods" end className="nav-link">
            Pay Periods
          </NavLink>

          {payPeriodLocked ? (
            <span className="nav-link disabled">
              Add Shift (Submitted)
            </span>
          ) : (
            <NavLink
              to="/guard/pay-periods/add-shift"
              className="nav-link"
            >
              Add Shift
            </NavLink>
          )}

          <NavLink to="/guard/announcements" className="nav-link">
            Announcements
          </NavLink>

          <button onClick={logout} className="logout-btn">
            Logout
          </button>
        </nav>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
