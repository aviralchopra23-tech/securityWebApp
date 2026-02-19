import { useNavigate, Outlet, useLocation } from "react-router-dom";
import "../../styles/ownerUsers.css";

export default function OwnerUsers() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) =>
    location.pathname.includes(path)
      ? "role-btn active"
      : "role-btn";

  return (
    <div className="users-page">
      <h3 className="users-title">Users</h3>

      <div className="user-role-switch">
        <button
          className={isActive("supervisors")}
          onClick={() => navigate("supervisors")}
        >
          Supervisors
        </button>

        <button
          className={isActive("guards")}
          onClick={() => navigate("guards")}
        >
          Guards
        </button>
      </div>

      {/* 🔥 REQUIRED FOR NESTED ROUTES */}
      <div className="users-content">
        <Outlet />
      </div>
    </div>
  );
}
