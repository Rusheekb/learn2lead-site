
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppRole } from '@/hooks/useProfile';

interface PrivateRouteProps {
  children?: React.ReactNode;
  allowedRoles?: AppRole[];
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, allowedRoles }) => {
  const { user, userRole, isLoading } = useAuth();

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
  
  // Role-based access control - simplified for better performance
  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    const redirectPaths = {
      'student': '/dashboard',
      'tutor': '/tutor-dashboard',
      'admin': '/admin-dashboard'
    };
    
    return <Navigate to={redirectPaths[userRole] || '/login'} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default PrivateRoute;
