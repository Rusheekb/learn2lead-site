/* eslint-disable react-refresh/only-export-components */
import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { FileUp, Download, Eye, Clock } from "lucide-react";
import { Profile } from "@/hooks/useProfile";

interface ContentShareItem {
  id: string;
  sender_id: string;
  receiver_id: string;
  title: string;
  description: string | null;
  file_path: string | null;
  content_type: string | null;
  shared_at: string;
  viewed_at: string | null;
}

interface ContentShareProps {
  role: 'student' | 'tutor' | 'admin';
  fetchUsers: () => Promise<Profile[]>;
}

const ContentShare: React.FC<ContentShareProps> = ({ role, fetchUsers }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [shares, setShares] = useState<ContentShareItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [users, setUsers] = useState<Profile[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const loadShares = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("content_shares")
        .select("*")
        .or(`sender_id.eq.${user?.id},receiver_id.eq.${user?.id}`)
        .order("shared_at", { ascending: false });

      if (error) {
        console.error("Error fetching shares:", error);
        toast.error("Failed to load shared content");
      } else {
        setShares(data || []);
      }
    } catch (error) {
      console.error("Error in loadShares:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const loadUsers = useCallback(async () => {
    try {
      const loadedUsers = await fetchUsers();
      setUsers(loadedUsers.filter(u => u.id !== user?.id));
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Failed to load users");
    }
  }, [fetchUsers, user]);

  useEffect(() => {
    if (user) {
      loadShares();
      loadUsers();
    }
  }, [user, loadShares, loadUsers]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleShareContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedUser || !formData.title) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsUploading(true);
    try {
      let filePath = null;
      
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${user.id}-${fileExt}`;
        const path = `${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('shared_content')
          .upload(path, file);
          
        if (uploadError) {
          throw uploadError;
        }
        
        const { data } = supabase.storage
          .from('shared_content')
          .getPublicUrl(path);
          
        filePath = data.publicUrl;
      }
      
      const { error } = await supabase
        .from('content_shares')
        .insert({
          sender_id: user.id,
          receiver_id: selectedUser,
          title: formData.title,
          description: formData.description,
          file_path: filePath,
          content_type: file?.type || null,
        });
        
      if (error) {
        throw error;
      }
      
      toast.success("Content shared successfully");
      setIsOpen(false);
      setFormData({ title: "", description: "" });
      setFile(null);
      setSelectedUser("");
      loadShares();
    } catch (error) {
      console.error("Error sharing content:", error);
      toast.error("Failed to share content");
    } finally {
      setIsUploading(false);
    }
  };

  const markAsViewed = async (shareId: string) => {
    try {
      const { error } = await supabase
        .from('content_shares')
        .update({ viewed_at: new Date().toISOString() })
        .eq('id', shareId)
        .eq('receiver_id', user?.id);
        
      if (error) {
        throw error;
      }
      
      loadShares();
    } catch (error) {
      console.error("Error marking as viewed:", error);
      toast.error("Failed to update view status");
    }
  };

  const getUserName = (userId: string) => {
    const userProfile = users.find(u => u.id === userId);
    if (!userProfile) return "Unknown User";
    return userProfile.first_name && userProfile.last_name 
      ? `${userProfile.first_name} ${userProfile.last_name}`
      : userProfile.email.split('@')[0];
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Shared Content</h2>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <FileUp className="h-4 w-4" />
              <span>Share Content</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Share Content</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleShareContent} className="space-y-4">
              <div>
                <label htmlFor="receiverUser" className="block text-sm font-medium mb-1">
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
                <label htmlFor="description" className="block text-sm font-medium mb-1">
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
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileChange}
                />
                {file && (
                  <p className="mt-1 text-sm text-gray-500">{file.name} ({(file.size / 1024).toFixed(1)} KB)</p>
                )}
              </div>
              
              <DialogFooter>
                <Button type="submit" disabled={isUploading}>
                  {isUploading ? "Uploading..." : "Share"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <p>Loading shared content...</p>
        </div>
      ) : shares.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>{role === 'student' ? 'From' : 'To'}</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shares.map((share) => {
              const isSender = share.sender_id === user?.id;
              return (
                <TableRow key={share.id}>
                  <TableCell className="font-medium">
                    {share.title}
                    {share.description && (
                      <p className="text-sm text-gray-500">{share.description}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    {isSender 
                      ? getUserName(share.receiver_id)
                      : getUserName(share.sender_id)}
                  </TableCell>
                  <TableCell>
                    {new Date(share.shared_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {share.viewed_at ? (
                      <div className="flex items-center text-green-600">
                        <Eye className="h-4 w-4 mr-1" /> Viewed
                      </div>
                    ) : (
                      <div className="flex items-center text-amber-600">
                        <Clock className="h-4 w-4 mr-1" /> Pending
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      {share.file_path && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => window.open(share.file_path!, '_blank')}
                          className="flex items-center"
                        >
                          <Download className="h-4 w-4 mr-1" /> 
                          <span>Download</span>
                        </Button>
                      )}
                      
                      {!isSender && !share.viewed_at && (
                        <Button 
                          size="sm" 
                          onClick={() => markAsViewed(share.id)}
                          variant="secondary"
                        >
                          Mark as Viewed
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-8 bg-gray-50 border rounded-md">
          <p className="text-gray-500">No shared content found</p>
          <p className="text-sm text-gray-400 mt-1">
            {role === 'student' 
              ? "Your tutors have not shared any content with you yet" 
              : "You have not shared any content with your students yet"}
          </p>
        </div>
      )}
    </div>
  );
};

export default ContentShare;
