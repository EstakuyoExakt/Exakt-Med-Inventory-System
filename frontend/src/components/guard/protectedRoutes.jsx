import { Navigate, Outlet } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

function ProtectedRoute({ allowedRoles }) {
  const { user, isAuthenticated } = useAuth();

  // If not logged in, redirect to login page
  if (!isAuthenticated || !user) {
    return <Navigate to="/" replace />;
  }

  // If role-restricted and user's role is not included, redirect to unauthorized
  if (
    allowedRoles &&
    allowedRoles.length > 0 &&
    !allowedRoles.includes(user.role)
  ) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Render child routes
  return <Outlet />;
}

export default ProtectedRoute;
