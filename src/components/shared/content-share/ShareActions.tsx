
import React from 'react';
import { Button } from '@/components/ui/button';
import { FileUp } from 'lucide-react';

interface ShareActionsProps {
  openShareDialog: () => void;
}

const ShareActions: React.FC<ShareActionsProps> = ({ openShareDialog }) => {
  return (
    <div className="flex justify-between items-center">
      <h2 className="text-2xl font-bold">Shared Content</h2>
      <Button onClick={openShareDialog}>
        <FileUp className="h-4 w-4 mr-1" /> Share Content
      </Button>
    </div>
  );
};

export default ShareActions;
