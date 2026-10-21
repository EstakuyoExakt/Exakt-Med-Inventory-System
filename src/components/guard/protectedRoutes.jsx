import { Navigate, Outlet } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { ROLES } from "../../config/roles";

function ProtectedRoute({ allowedRoles, redirectTo = "/unauthorized" }) {
  const { user, isAuthenticated } = useAuth();

  // If not logged in, redirect to login page
  if (!isAuthenticated || !user) {
    return <Navigate to="/" replace />;
  }

  // Super Admin has enterprise-wide access across all modules and pages
  const isSuperAdmin =
    user.role === ROLES.SUPER_ADMIN || user.role === "Super Admin";

  // If role-restricted and user's role is not included, redirect
  if (
    !isSuperAdmin &&
    allowedRoles &&
    allowedRoles.length > 0 &&
    !allowedRoles.includes(user.role)
  ) {
    return <Navigate to={redirectTo} replace />;
  }

  // Render child routes
  return <Outlet />;
}

export default ProtectedRoute;
