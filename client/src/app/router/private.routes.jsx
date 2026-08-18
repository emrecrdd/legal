import {
  Navigate,
  Outlet,
} from 'react-router-dom';

import {
  useAuth,
} from '../providers/auth.provider.jsx';

const PrivateRoute = ({
  requiredRole,
  allowedRoles,
}) => {
  const {
    isAuthenticated,
    loading,
    user,
  } = useAuth();

  // ====================================================
  // LOADING
  // ====================================================

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-b-blue-600 dark:border-white/[0.08] dark:border-b-blue-500" />
      </div>
    );
  }

  // ====================================================
  // AUTH
  // ====================================================

  if (
    !isAuthenticated ||
    !user
  ) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  const userRole =
    user.role;

  // ====================================================
  // SINGLE ROLE
  // Backward compatibility:
  // <PrivateRoute requiredRole="admin" />
  // ====================================================

  if (
    requiredRole &&
    userRole !== requiredRole
  ) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  // ====================================================
  // MULTIPLE ROLES
  //
  // Örnek:
  // <PrivateRoute
  //   allowedRoles={['admin', 'lawyer']}
  // />
  // ====================================================

  if (
    Array.isArray(
      allowedRoles
    ) &&
    allowedRoles.length > 0 &&
    !allowedRoles.includes(
      userRole
    )
  ) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  return <Outlet />;
};

export default PrivateRoute;