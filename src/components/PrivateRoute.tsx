
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppRole } from '@/hooks/useProfile';
import { getDashboardPath } from '@/utils/authNavigation';

interface PrivateRouteProps {
  children?: React.ReactNode;
  allowedRoles?: AppRole[];
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, allowedRoles }) => {
  const { user, userRole, isLoading } = useAuth();
  const location = useLocation();

  // Show a simpler loading indicator to reduce render complexity
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-tutoring-blue"></div>
      </div>
    );
  }

  if (!user) {
    // Redirect to login and remember where they were trying to go
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // Role-based access control
  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    // Redirect to appropriate dashboard based on role
    return <Navigate to={getDashboardPath(userRole)} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default PrivateRoute;
