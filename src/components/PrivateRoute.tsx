import React, { useEffect } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppRole } from '@/hooks/useProfile';

interface PrivateRouteProps {
  children?: React.ReactNode;
  allowedRoles?: AppRole[];
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, allowedRoles }) => {
  const { user, userRole, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Only run redirection if we have both user and role information
    if (!isLoading && user && userRole && allowedRoles && !allowedRoles.includes(userRole)) {
      redirectBasedOnRole(userRole, navigate);
    }
  }, [user, userRole, allowedRoles, isLoading, navigate]);

  // Show a simpler loading indicator to reduce render complexity
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-tutoring-blue"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Role-based access control
  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    return redirectBasedOnRole(userRole);
  }

  return children ? <>{children}</> : <Outlet />;
};

// Helper function to handle role-based redirection
const redirectBasedOnRole = (role: AppRole, navigateFunc?: ReturnType<typeof useNavigate>) => {
  const redirectPaths = {
    'student': '/dashboard',
    'tutor': '/tutor-dashboard',
    'admin': '/admin-dashboard'
  };
  
  const path = redirectPaths[role] || '/login';
  
  // If navigate function is provided, use it (for useEffect)
  if (navigateFunc) {
    navigateFunc(path);
    return null;
  }
  
  // Otherwise return Navigate component (for direct returns)
  return <Navigate to={path} replace />;
};

export default PrivateRoute;
