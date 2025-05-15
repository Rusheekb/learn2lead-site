
import React from 'react';

interface AuthErrorProps {
  error: string | null;
}

const AuthError: React.FC<AuthErrorProps> = ({ error }) => {
  if (!error) return null;
  
  return (
    <div className="bg-red-50 text-red-800 p-3 rounded-md mb-4 text-sm">
      {error}
    </div>
  );
};

export default AuthError;
