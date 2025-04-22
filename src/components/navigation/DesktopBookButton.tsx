import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const DesktopBookButton = () => {
  const navigate = useNavigate();

  return (
    <Button
      onClick={() => navigate('/book')}
      className="bg-tutoring-blue hover:bg-blue-700 text-white"
    >
      Book a Session
    </Button>
  );
};

export default DesktopBookButton;
