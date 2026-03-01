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

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="owner-container">
      <header className="owner-header">
        <div className="owner-header-top">
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
            <button
              type="button"
              className="owner-menu-btn"
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
              onClick={toggleMenu}
            >
              ☰
            </button>

            <button
              type="button"
              onClick={logout}
              className="owner-logout desktop-only"
            >
              Logout
            </button>
          </div>
        </div>

        <nav
          className={`owner-nav ${menuOpen ? "open" : ""}`}
          aria-label="Owner navigation"
        >
          <Link to="/owner" className={getLinkClass("/owner")} onClick={closeMenu}>
            Home
          </Link>

          <Link
            to="/owner/locations"
            className={getLinkClass("/owner/locations")}
            onClick={closeMenu}
          >
            Locations
          </Link>

          <Link
            to="/owner/users"
            className={getLinkClass("/owner/users")}
            onClick={closeMenu}
          >
            Users
          </Link>

          <Link
            to="/owner/pay-period-reports"
            className={getLinkClass("/owner/pay-period-reports")}
            onClick={closeMenu}
          >
            Pay Period Reports
          </Link>

          <Link
            to="/owner/announcements"
            className={getLinkClass("/owner/announcements")}
            onClick={closeMenu}
          >
            Announcements
          </Link>

          <button
            type="button"
            onClick={logout}
            className="owner-logout mobile-only"
          >
            Logout
          </button>
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