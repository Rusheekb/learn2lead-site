import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppRole } from '@/hooks/useProfile';

interface PrivateRouteProps {
  children?: React.ReactNode;
  allowedRoles?: AppRole[];
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { user, userRole, isLoading } = useAuth();

  // Show a simple loading indicator
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-tutoring-blue"></div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Role-based access - only enforce if allowedRoles is provided and not empty
  if (allowedRoles && allowedRoles.length > 0 && userRole) {
    if (!allowedRoles.includes(userRole)) {
      // Redirect to the appropriate dashboard based on role
      switch (userRole) {
        case 'student':
          return <Navigate to="/dashboard" replace />;
        case 'tutor':
          return <Navigate to="/tutor-dashboard" replace />;
        case 'admin':
          return <Navigate to="/admin-dashboard" replace />;
        default:
          return <Navigate to="/login" replace />;
      }
    }
  }

  return children ? <>{children}</> : <Outlet />;
};

export default PrivateRoute;
