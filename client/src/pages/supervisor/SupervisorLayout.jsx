import { Outlet, NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { logout } from "../../utils/logout";
import api from "../../api/axios";
import "../../styles/supervisor.css";

export default function SupervisorLayout() {
  const [userName, setUserName] = useState("Supervisor");
  const [role, setRole] = useState("SUPERVISOR");

  // ✅ SAFE: backend is single source of truth
  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await api.get("/auth/me");
        setUserName(res.data.firstName);
        setRole(res.data.role);
      } catch {
        setUserName("Supervisor");
        setRole("SUPERVISOR");
      }
    };

    loadUser();
  }, []);

  return (
    <div className="layout">
      <aside className="sidebar">
        {/* ===== BRAND HEADER (MATCH GUARD) ===== */}
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
            <span className="brand-name">{userName}</span>
            <span className="brand-role role-badge">{role}</span>
          </div>
        </div>

        {/* ===== NAV ===== */}
        <nav className="nav">
          <NavLink to="/supervisor" end className="nav-link">
            Home
          </NavLink>

          <NavLink to="/supervisor/schedule" className="nav-link">
            Schedule
          </NavLink>

          <NavLink
            to="/supervisor/pay-periods"
            end
            className="nav-link"
          >
            Pay Periods
          </NavLink>

          <NavLink
            to="/supervisor/pay-periods/add-shift"
            className="nav-link"
          >
            Add Shift
          </NavLink>

          <NavLink
            to="/supervisor/announcements"
            className="nav-link"
          >
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
