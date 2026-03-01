import { Outlet, NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { logout } from "../../utils/logout";
import api from "../../api/axios";
import kingLogo from "../../assets/king.png";

// Layout & shared buttons
import "../../styles/layout.css"; 
import "../../styles/ui-buttons.css";

export default function SupervisorLayout() {
  const [userName, setUserName] = useState("Supervisor");
  const [role, setRole] = useState("SUPERVISOR");
  const [isNavOpen, setIsNavOpen] = useState(false);

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
      <div className="supervisor-topbar">
        <div className="supervisor-topbar-brand">
          <img
            src={kingLogo}
            alt="King Logo"
            className="supervisor-topbar-logo"
          />
          <div className="supervisor-topbar-text">
            <span className="supervisor-topbar-name">{userName}</span>
            <span className="supervisor-topbar-role">{role}</span>
          </div>
        </div>

        <button
          type="button"
          className={`mobile-nav-toggle ${isNavOpen ? "active" : ""}`}
          onClick={() => setIsNavOpen((prev) => !prev)}
          aria-label={isNavOpen ? "Close navigation menu" : "Open navigation menu"}
        >
          {isNavOpen ? "✕" : "☰"}
        </button>
      </div>

      {isNavOpen && <div className="mobile-nav-backdrop" onClick={() => setIsNavOpen(false)} />}

      {/* SIDEBAR */}
      <aside className={`sidebar ${isNavOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <div className="brand-logo">
            <img
              src={kingLogo}
              alt="King Logo"
              style={{ width: 32, height: 32, objectFit: "contain" }}
            />
          </div>
          <div className="brand-text">
            <span className="brand-name">{userName}</span>
            <span className="brand-role">{role}</span>
          </div>
        </div>

        {/* NAVIGATION */}
        <nav className="nav">
          <NavLink to="/supervisor" end className="nav-link" onClick={() => setIsNavOpen(false)}>
            <span className="nav-label-full">Home</span>
            <span className="nav-label-short">Home</span>
          </NavLink>
          <NavLink to="/supervisor/schedule" className="nav-link" onClick={() => setIsNavOpen(false)}>
            <span className="nav-label-full">Schedule</span>
            <span className="nav-label-short">Sched</span>
          </NavLink>
          <NavLink to="/supervisor/pay-periods" end className="nav-link" onClick={() => setIsNavOpen(false)}>
            <span className="nav-label-full">Pay Periods</span>
            <span className="nav-label-short">Pay</span>
          </NavLink>
          <NavLink to="/supervisor/pay-periods/add-shift" className="nav-link" onClick={() => setIsNavOpen(false)}>
            <span className="nav-label-full">Add Shift</span>
            <span className="nav-label-short">Add</span>
          </NavLink>
          <NavLink to="/supervisor/announcements" className="nav-link" onClick={() => setIsNavOpen(false)}>
            <span className="nav-label-full">Announcements</span>
            <span className="nav-label-short">News</span>
          </NavLink>

          <button
            onClick={() => {
              setIsNavOpen(false);
              logout();
            }}
          >
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