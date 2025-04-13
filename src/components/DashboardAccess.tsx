import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { UserCircle, GraduationCap, ShieldCheck } from 'lucide-react';

const DashboardAccess: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 bg-white p-4 rounded-lg shadow-lg border border-gray-200">
      <h3 className="text-sm font-medium text-gray-500 mb-2">Quick Access (Testing)</h3>
      <Button 
        variant="outline" 
        className="flex items-center gap-2" 
        onClick={() => navigate('/dashboard')}
      >
        <UserCircle className="h-4 w-4" />
        Student Dashboard
      </Button>
      <Button 
        variant="outline" 
        className="flex items-center gap-2" 
        onClick={() => navigate('/tutor-dashboard')}
      >
        <GraduationCap className="h-4 w-4" />
        Tutor Dashboard
      </Button>
      <Button 
        variant="outline" 
        className="flex items-center gap-2" 
        onClick={() => navigate('/admin-dashboard')}
      >
        <ShieldCheck className="h-4 w-4" />
        Admin Dashboard
      </Button>
    </div>
  );
};

export default DashboardAccess; 