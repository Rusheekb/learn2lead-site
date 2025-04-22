
import React from "react";

interface SharesEmptyStateProps {
  role: 'student' | 'tutor' | 'admin';
}

const SharesEmptyState: React.FC<SharesEmptyStateProps> = ({ role }) => {
  return (
    <div className="text-center py-8 bg-gray-50 border rounded-md">
      <p className="text-gray-500">No shared content found</p>
      <p className="text-sm text-gray-400 mt-1">
        {role === 'student' 
          ? "Your tutors have not shared any content with you yet" 
          : "You have not shared any content with your students yet"}
      </p>
    </div>
  );
};

export default SharesEmptyState;
