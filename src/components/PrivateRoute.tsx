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
    // When user role becomes available, redirect if needed
    if (user && userRole && allowedRoles && !allowedRoles.includes(userRole)) {
      redirectBasedOnRole(userRole, navigate);
    }
  }, [user, userRole, allowedRoles, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-tutoring-blue"></div>
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
  let path = '/login'; // Default fallback
  
  switch (role) {
    case 'student':
      path = '/dashboard';
      break;
    case 'tutor':
      path = '/tutor-dashboard';
      break;
    case 'admin':
      path = '/admin-dashboard';
      break;
  }
  
  // If navigate function is provided, use it (for useEffect)
  if (navigateFunc) {
    navigateFunc(path);
    return null;
  }
  
  // Otherwise return Navigate component (for direct returns)
  return <Navigate to={path} replace />;
};

export default PrivateRoute;
