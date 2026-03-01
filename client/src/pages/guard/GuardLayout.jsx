import { Outlet, NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { logout } from "../../utils/logout";
import api from "../../api/axios";
import kingLogo from "../../assets/king.png";

// Layout & shared buttons
import "../../styles/layout.css"; // .layout, .sidebar, .main-content, nav styles, sidebar button
import "../../styles/ui-buttons.css"; // shared .btn-primary, .btn-secondary

export default function GuardLayout() {
  const [payPeriodLocked, setPayPeriodLocked] = useState(false);
  const [guardName, setGuardName] = useState("Guard");
  const [role, setRole] = useState("GUARD");
  const location = useLocation();

  // Track pay period submission
  useEffect(() => {
    setPayPeriodLocked(
      sessionStorage.getItem("guardPayPeriodSubmitted") === "true"
    );
  }, [location.pathname]);

  // Load user info from backend
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
    <div className="layout guard">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand-logo">
            <img
              src={kingLogo}
              alt="King Logo"
              style={{ width: 40, height: 40, objectFit: "contain" }}
            />
          </div>
          <div className="brand-text">
            <span className="brand-name">{guardName}</span>
            <span className="brand-role">{role}</span>
          </div>
        </div>

        {/* NAVIGATION */}
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
            <span className="nav-link disabled">Add Shift (Submitted)</span>
          ) : (
            <NavLink to="/guard/pay-periods/add-shift" className="nav-link">
              Add Shift
            </NavLink>
          )}

          <NavLink to="/guard/announcements" className="nav-link">
            Announcements
          </NavLink>

          {/* LOGOUT BUTTON */}
          <button onClick={logout} className="btn-primary">
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