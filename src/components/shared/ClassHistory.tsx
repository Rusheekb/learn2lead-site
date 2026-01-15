import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, BookOpen, Edit3 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { parseDateToLocal } from '@/utils/safeDateUtils';
import { ClassHistorySkeleton } from '@/components/shared/skeletons';

interface ClassHistoryItem {
  id: string;
  'Class Number': string | null;
  'Tutor Name': string | null;
  'Student Name': string | null;
  Date: string;
  'Time (CST)': string | null;
  'Time (hrs)': string | null;
  Subject: string | null;
  Content: string | null;
  HW: string | null;
  'Additional Info': string | null;
  'Class ID': string | null;
}

interface ClassHistoryProps {
  userRole: 'student' | 'tutor' | 'admin';
}

const ClassHistory: React.FC<ClassHistoryProps> = ({ userRole }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [classHistory, setClassHistory] = useState<ClassHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<ClassHistoryItem | null>(null);
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editHomework, setEditHomework] = useState('');

  useEffect(() => {
    fetchClassHistory();
  }, [user, userRole]);

  // Setup realtime subscription for class_logs
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('class-history-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'class_logs',
        },
        () => {
          fetchClassHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, userRole]);

  const fetchClassHistory = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      // Get user profile for name matching
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', user.id)
        .single();

      if (!profile) {
        setIsLoading(false);
        return;
      }
      
      const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
      
      let query = supabase.from('class_logs').select('*');
      
      if (userRole === 'tutor') {
        // Query by either full name or email, handling cases where name might be empty
        if (fullName) {
          query = query.or(`"Tutor Name".eq."${fullName}","Tutor Name".eq."${profile.email}"`);
        } else {
          query = query.eq('"Tutor Name"', profile.email);
        }
      } else if (userRole === 'student') {
        // Query by either full name or email, handling cases where name might be empty
        if (fullName) {
          query = query.or(`"Student Name".eq."${fullName}","Student Name".eq."${profile.email}"`);
        } else {
          query = query.eq('"Student Name"', profile.email);
        }
      }
      // Admin can see all - no filter needed

      const { data, error } = await query.order('Date', { ascending: false });

      if (error) {
        throw error;
      }
      
      setClassHistory(data || []);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching class history:', error);
      }
      toast.error('Failed to load class history');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClass = (classItem: ClassHistoryItem) => {
    setSelectedClass(classItem);
    setEditContent(classItem.Content || '');
    setEditHomework(classItem.HW || '');
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedClass) return;

    try {
      const { error } = await supabase
        .from('class_logs')
        .update({
          Content: editContent,
          HW: editHomework,
        })
        .eq('id', selectedClass.id);

      if (error) throw error;

      toast.success('Class description updated successfully');
      setIsEditDialogOpen(false);
      fetchClassHistory();
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error updating class:', error);
      }
      toast.error('Failed to update class description');
    }
  };


  if (isLoading) {
    return <ClassHistorySkeleton count={5} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Class History</h3>
        <Badge variant="secondary">
          {classHistory.length} classes completed
        </Badge>
      </div>

      {classHistory.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No completed classes yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {classHistory.map((classItem) => {
            const isExpanded = expandedClassId === classItem.id;
            
            return (
              <Card 
                key={classItem.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setExpandedClassId(isExpanded ? null : classItem.id)}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{classItem['Class Number'] || 'Untitled'}</span>
                        <Badge variant="outline" className="text-xs">{classItem.Subject || 'Unknown'}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(parseDateToLocal(classItem.Date), 'MMM d, yyyy')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {userRole === 'student' ? (classItem['Tutor Name'] || 'Unknown Tutor') : (classItem['Student Name'] || 'Unknown Student')}
                        </span>
                      </div>
                    </div>
                    {userRole === 'tutor' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditClass(classItem);
                        }}
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t space-y-2">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {classItem['Time (CST)'] || 'Unknown time'} ({classItem['Time (hrs)'] || '0'}h)
                        </div>
                      </div>
                      
                      {classItem.Content && (
                        <div>
                          <h4 className="font-medium text-sm mb-1">What was covered:</h4>
                          <p className="text-sm text-muted-foreground">{classItem.Content}</p>
                        </div>
                      )}
                      
                      {classItem.HW && (
                        <div>
                          <h4 className="font-medium text-sm mb-1">Homework assigned:</h4>
                          <p className="text-sm text-muted-foreground">{classItem.HW}</p>
                        </div>
                      )}
                      
                      {classItem['Additional Info'] && (
                        <div>
                          <h4 className="font-medium text-sm mb-1">Additional notes:</h4>
                          <p className="text-sm text-muted-foreground">{classItem['Additional Info']}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Class Description</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="content">What was covered in this class?</Label>
              <Textarea
                id="content"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Describe what topics were covered, activities done, progress made..."
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="homework">Homework assigned</Label>
              <Textarea
                id="homework"
                value={editHomework}
                onChange={(e) => setEditHomework(e.target.value)}
                placeholder="Describe any homework, practice problems, or follow-up tasks..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClassHistory;