
import React from 'react';

const ProfileNotFound: React.FC = () => {
  return (
    <div className="text-center py-8 border rounded-md">
      <p className="text-lg font-medium text-gray-600 dark:text-gray-300">
        Profile Not Found
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
        Please sign in to view your profile
      </p>
    </div>
  );
};

export default ProfileNotFound;
