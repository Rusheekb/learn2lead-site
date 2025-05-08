
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardPath } from '@/utils/authNavigation';

const Logo = () => {
  const { user, userRole } = useAuth();
  
  // Determine the target path based on authentication state
  const targetPath = user ? getDashboardPath(userRole) : '/';

  return (
    <Link to={targetPath} className="text-2xl font-bold text-tutoring-blue">
      Learn<span className="text-tutoring-teal">2</span>Lead
    </Link>
  );
};

export default Logo;
