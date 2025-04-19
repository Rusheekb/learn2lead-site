
import { Link } from 'react-router-dom';

const Logo = () => {
  return (
    <Link to="/" className="text-2xl font-bold text-tutoring-blue">
      Learn<span className="text-tutoring-teal">2</span>Lead
    </Link>
  );
};

export default Logo;
