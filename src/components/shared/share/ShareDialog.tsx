import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FileUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Profile } from '@/hooks/useProfile';

interface ShareDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  users: Profile[];
  selectedUser: string;
  setSelectedUser: (value: string) => void;
  formData: {
    title: string;
    description: string;
  };
  setFormData: React.Dispatch<
    React.SetStateAction<{
      title: string;
      description: string;
    }>
  >;
  file: File | null;
  setFile: React.Dispatch<React.SetStateAction<File | null>>;
  handleShare: (e: React.FormEvent) => void;
  isUploading: boolean;
}

const ShareDialog: React.FC<ShareDialogProps> = ({
  isOpen,
  onOpenChange,
  users,
  selectedUser,
  setSelectedUser,
  formData,
  setFormData,
  file,
  setFile,
  handleShare,
  isUploading,
}) => {
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setFormData((prev) => ({
        ...prev,
        title: selectedFile.name.split('.')[0],
      }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Content</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleShare} className="space-y-4">
          <div>
            <label
              htmlFor="receiverUser"
              className="block text-sm font-medium mb-1"
            >
              Select Recipient
            </label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger id="receiverUser">
                <SelectValue placeholder="Select recipient" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.first_name && user.last_name
                      ? `${user.first_name} ${user.last_name} (${user.role})`
                      : `${user.email} (${user.role})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-1">
              Title *
            </label>
            <Input
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Enter content title"
              required
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium mb-1"
            >
              Description
            </label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Add a description (optional)"
              className="resize-none h-20"
            />
          </div>

          <div>
            <label htmlFor="file" className="block text-sm font-medium mb-1">
              Attachment (optional)
            </label>
            <Input id="file" type="file" onChange={handleFileChange} />
            {file && (
              <p className="mt-1 text-sm text-gray-500">
                {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isUploading}>
              {isUploading ? 'Uploading...' : 'Share'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ShareDialog;
