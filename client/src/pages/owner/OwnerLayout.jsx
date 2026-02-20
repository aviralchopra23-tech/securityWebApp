import { Outlet, Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { logout } from "../../utils/logout";
import king from "../../assets/king.png";
import "../../styles/ownerLayout.css";

export default function OwnerLayout() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const getLinkClass = (path) =>
    location.pathname === path ? "owner-link active" : "owner-link";

  const toggleMenu = () => setMenuOpen((prev) => !prev);

  return (
    <div
      className={`owner-container ${
        location.pathname === "/owner/pay-period-reports"
          ? "no-gradient"
          : ""
      }`}
    >
      <header className="owner-header">
        <div className="owner-header-top">
          {/* Logo + Title */}
          <div className="owner-title-flex">
            <img
              src={king}
              alt="SecureStaff Logo"
              className="owner-title-logo"
            />
            <h2 className="owner-title owner-title-gradient">
              Operations Console
            </h2>
          </div>

          <div className="owner-header-actions">
            {/* Mobile toggle */}
            <button
              type="button"
              className="owner-menu-btn"
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
              onClick={toggleMenu}
            >
              ☰
            </button>

            {/* Desktop Logout */}
            <button
              type="button"
              onClick={logout}
              className="owner-logout"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav
          className={`owner-nav ${menuOpen ? "open" : ""}`}
          aria-label="Owner navigation"
        >
          <Link
            to="/owner"
            className={getLinkClass("/owner")}
            onClick={() => setMenuOpen(false)}
          >
            Home
          </Link>

          <Link
            to="/owner/locations"
            className={getLinkClass("/owner/locations")}
            onClick={() => setMenuOpen(false)}
          >
            Locations
          </Link>

          <Link
            to="/owner/users"
            className={getLinkClass("/owner/users")}
            onClick={() => setMenuOpen(false)}
          >
            Users
          </Link>

          <Link
            to="/owner/pay-period-reports"
            className={getLinkClass("/owner/pay-period-reports")}
            onClick={() => setMenuOpen(false)}
          >
            Pay Period Reports
          </Link>

          <Link
            to="/owner/announcements"
            className={getLinkClass("/owner/announcements")}
            onClick={() => setMenuOpen(false)}
          >
            Announcements
          </Link>

          
        </nav>
      </header>

      <main className="owner-content">
        <Outlet />
      </main>

      <footer className="owner-footer">
        <div className="owner-footer-inner">
          <span>© {new Date().getFullYear()} Security Operations System</span>
          <span>Owner Console</span>
        </div>
      </footer>
    </div>
  );
}