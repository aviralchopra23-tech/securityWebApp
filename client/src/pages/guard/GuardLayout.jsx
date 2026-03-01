import { Outlet, NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { logout } from "../../utils/logout";
import api from "../../api/axios";
import kingLogo from "../../assets/king.png";
import useAnnouncementNotifications from "../../hooks/useAnnouncementNotifications";
import { getUserIdFromToken } from "../../utils/auth";

// Layout & shared buttons
import "../../styles/layout.css"; // .layout, .sidebar, .main-content, nav styles, sidebar button
import "../../styles/ui-buttons.css"; // shared .btn-primary, .btn-secondary

export default function GuardLayout() {
  const [payPeriodLocked, setPayPeriodLocked] = useState(false);
  const [guardName, setGuardName] = useState("Guard");
  const [role, setRole] = useState("GUARD");
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [announcementScope, setAnnouncementScope] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const location = useLocation();

  const isAnnouncementsPage = location.pathname.startsWith("/guard/announcements");
  const { hasNewAnnouncements, unreadAnnouncementsCount, markAnnouncementsSeen } =
    useAnnouncementNotifications({
      storageScope: announcementScope,
      isAnnouncementPage: isAnnouncementsPage,
      currentUserId,
      enabled: Boolean(announcementScope),
    });

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
        const tokenUserId = getUserIdFromToken();
        const identifier = tokenUserId || res.data?.email || res.data?.firstName || "default";
        setCurrentUserId(tokenUserId || null);
        setAnnouncementScope(`guard:${identifier}`);
      } catch {
        setGuardName("Guard");
        setRole("GUARD");
        setCurrentUserId(null);
        setAnnouncementScope("guard:default");
      }
    };
    loadUser();
  }, []);

  return (
    <div className="layout guard">
      <div className="guard-topbar">
        <div className="guard-topbar-brand">
          <img
            src={kingLogo}
            alt="King Logo"
            className="guard-topbar-logo"
          />
          <div className="guard-topbar-text">
            <span className="guard-topbar-name">{guardName}</span>
            <span className="guard-topbar-role">{role}</span>
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
          <NavLink to="/guard" end className="nav-link" onClick={() => setIsNavOpen(false)}>
            Home
          </NavLink>

          <NavLink to="/guard/schedule" className="nav-link" onClick={() => setIsNavOpen(false)}>
            Schedule
          </NavLink>

          <NavLink to="/guard/pay-periods" end className="nav-link" onClick={() => setIsNavOpen(false)}>
            Pay Periods
          </NavLink>

          {payPeriodLocked ? (
            <span className="nav-link disabled">Add Shift (Submitted)</span>
          ) : (
            <NavLink to="/guard/pay-periods/add-shift" className="nav-link" onClick={() => setIsNavOpen(false)}>
              Add Shift
            </NavLink>
          )}

          <NavLink
            to="/guard/announcements"
            className="nav-link nav-link-with-badge"
            onClick={() => {
              setIsNavOpen(false);
              markAnnouncementsSeen();
            }}
          >
            <span>Announcements</span>
            {hasNewAnnouncements && (
              <span className="nav-badge" aria-label={`${unreadAnnouncementsCount} new announcements`}>
                {unreadAnnouncementsCount > 9 ? "9+" : unreadAnnouncementsCount}
              </span>
            )}
          </NavLink>

          {/* LOGOUT BUTTON */}
          <button
            onClick={() => {
              setIsNavOpen(false);
              logout();
            }}
            className="btn-primary"
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