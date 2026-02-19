import { Navigate } from "react-router-dom";
import { getUserRoleFromToken } from "../utils/auth";

export default function ProtectedRoute({ allowedRoles, children }) {
  const role = getUserRoleFromToken();

  if (!role) {
    // Not logged in
    return <Navigate to="/" replace />;
  }

  if (!allowedRoles.includes(role)) {
    // Logged in but wrong role
    return <Navigate to="/" replace />;
  }

  return children;
}
