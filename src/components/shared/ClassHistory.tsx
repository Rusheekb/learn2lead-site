import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock, BookOpen, User, FileText, Edit3, Undo2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';

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
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editHomework, setEditHomework] = useState('');
  const [isReverting, setIsReverting] = useState<string | null>(null);

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
        (payload) => {
          console.log('Realtime update for class history:', payload);
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

      if (!profile) return;

      const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
      
      let query = supabase.from('class_logs').select('*');
      
      if (userRole === 'tutor') {
        query = query.or(`"Tutor Name".eq.${fullName},"Tutor Name".eq.${profile.email}`);
      } else if (userRole === 'student') {
        query = query.or(`"Student Name".eq.${fullName},"Student Name".eq.${profile.email}`);
      }
      // Admin can see all - no filter needed

      const { data, error } = await query.order('Date', { ascending: false });

      if (error) {
        console.error('Error fetching class history:', error);
        throw error;
      }

      console.log('Fetched class history:', data);
      setClassHistory(data || []);
    } catch (error) {
      console.error('Error fetching class history:', error);
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
      console.error('Error updating class:', error);
      toast.error('Failed to update class description');
    }
  };

  const handleRevertClass = async (classItem: ClassHistoryItem) => {
    if (!classItem['Class ID']) {
      toast.error('Cannot revert class: missing class ID');
      return;
    }

    setIsReverting(classItem.id);
    try {
      // Get student ID from the database by matching student name
      const studentName = classItem['Student Name'];
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('first_name', studentName?.split(' ')[0] || '')
        .eq('last_name', studentName?.split(' ').slice(1).join(' ') || '');

      if (profileError || !profiles?.length) {
        console.error('Error finding student profile:', profileError);
        toast.error('Cannot find student profile to revert class');
        return;
      }

      const studentId = profiles[0].id;

      // Calculate end time based on duration
      const startTime = classItem['Time (CST)'] || '09:00';
      const duration = parseFloat(classItem['Time (hrs)'] || '1');
      const [hours, minutes] = startTime.split(':').map(Number);
      const endDate = new Date();
      endDate.setHours(hours + Math.floor(duration), minutes + ((duration % 1) * 60));
      const endTime = endDate.toTimeString().slice(0, 5);

      // Restore to scheduled_classes
      const { error: scheduleError } = await supabase
        .from('scheduled_classes')
        .insert({
          title: classItem['Class Number'] || 'Untitled Class',
          date: classItem.Date,
          start_time: startTime,
          end_time: endTime,
          subject: classItem.Subject || 'Unknown Subject',
          tutor_id: user!.id,
          student_id: studentId,
          status: 'scheduled',
          notes: classItem['Additional Info'],
        });

      if (scheduleError) {
        console.error('Error restoring scheduled class:', scheduleError);
        throw scheduleError;
      }

      // Remove from class_logs
      const { error: deleteLogError } = await supabase
        .from('class_logs')
        .delete()
        .eq('id', classItem.id);

      if (deleteLogError) {
        console.error('Error deleting class log:', deleteLogError);
        throw deleteLogError;
      }

      toast.success('Class reverted back to scheduled');
      
      // Invalidate scheduler queries to refresh the calendar
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['scheduledClasses', user.id] });
        queryClient.invalidateQueries({ queryKey: ['upcomingClasses', user.id] });
      }
      
      fetchClassHistory(); // Refresh the history
    } catch (error) {
      console.error('Error reverting class:', error);
      toast.error('Failed to revert class to scheduled');
    } finally {
      setIsReverting(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-1/4 mb-4"></div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted rounded mb-4"></div>
          ))}
        </div>
      </div>
    );
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
        <div className="space-y-4">
          {classHistory.map((classItem) => (
            <Card key={classItem.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{classItem['Class Number'] || 'Untitled Class'}</CardTitle>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <div className="flex items-center gap-1">
                        <CalendarDays className="h-4 w-4" />
                        {format(new Date(classItem.Date), 'PPP')}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {classItem['Time (CST)'] || 'Unknown time'} ({classItem['Time (hrs)'] || '0'}h)
                      </div>
                    </div>
                  </div>
                  {userRole === 'tutor' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditClass(classItem)}
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <Badge variant="outline">{classItem.Subject || 'Unknown Subject'}</Badge>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      {userRole === 'student' ? (classItem['Tutor Name'] || 'Unknown Tutor') : (classItem['Student Name'] || 'Unknown Student')}
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
              </CardContent>
            </Card>
          ))}
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
            <div className="flex justify-between gap-2">
              <Button
                variant="outline"
                onClick={() => selectedClass && handleRevertClass(selectedClass)}
                disabled={!selectedClass || isReverting === selectedClass?.id}
                className="text-orange-600 border-orange-600 hover:bg-orange-50"
              >
                <Undo2 className="h-4 w-4 mr-2" />
                {isReverting === selectedClass?.id ? 'Reverting...' : 'Revert to Scheduled'}
              </Button>
              <div className="flex gap-2">
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClassHistory;