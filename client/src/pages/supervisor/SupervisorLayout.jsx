import { Outlet, NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { logout } from "../../utils/logout";
import api from "../../api/axios";
import kingLogo from "../../assets/king.png";

// Layout & shared buttons
import "../../styles/layout.css"; // .layout, .sidebar, .main-content, nav styles, sidebar button
import "../../styles/ui-buttons.css"; // shared .btn-primary, .btn-secondary

export default function SupervisorLayout() {
  const [userName, setUserName] = useState("Supervisor");
  const [role, setRole] = useState("SUPERVISOR");

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
    <div className="layout supervisor">
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
            <span className="brand-name">{userName}</span>
            <span className="brand-role">{role}</span>
          </div>
        </div>

        {/* NAVIGATION */}
        <nav className="nav">
          <NavLink to="/supervisor" end className="nav-link">
            Home
          </NavLink>
          <NavLink to="/supervisor/schedule" className="nav-link">
            Schedule
          </NavLink>
          <NavLink to="/supervisor/pay-periods" end className="nav-link">
            Pay Periods
          </NavLink>
          <NavLink to="/supervisor/pay-periods/add-shift" className="nav-link">
            Add Shift
          </NavLink>
          <NavLink to="/supervisor/announcements" className="nav-link">
            Announcements
          </NavLink>

          {/* LOGOUT BUTTON */}
          <button onClick={logout}>Logout</button>
        </nav>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}