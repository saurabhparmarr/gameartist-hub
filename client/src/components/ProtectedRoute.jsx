import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { getDashboardPath } from "../services/authService.js";

function ProtectedRoute({ allowedRole }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
