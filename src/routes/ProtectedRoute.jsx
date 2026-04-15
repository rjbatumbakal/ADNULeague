import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

function ProtectedRoute({ children }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-theme-bg text-theme-text">
        Loading admin session...
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/adnu-admin-portal/login" replace />;
  }

  return children ?? <Outlet />;
}

export default ProtectedRoute;
