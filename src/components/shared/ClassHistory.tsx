import React, { useState, memo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, BookOpen, Edit3, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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

const PAGE_SIZE = 20;

const fetchClassHistoryPage = async (
  userId: string,
  userRole: string,
  page: number
): Promise<{ data: ClassHistoryItem[]; totalCount: number }> => {
  const column = userRole === 'tutor' ? 'tutor_user_id' : 'student_user_id';
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error, count } = await supabase
    .from('class_logs')
    .select('*', { count: 'exact' })
    .eq(column, userId)
    .order('Date', { ascending: false })
    .order('Time (CST)', { ascending: false })
    .range(from, to);

  if (error) throw error;
  return { data: data || [], totalCount: count || 0 };
};

const ClassHistory: React.FC<ClassHistoryProps> = memo(({ userRole }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassHistoryItem | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editHomework, setEditHomework] = useState('');

  const { data: result, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['classHistory', user?.id, userRole, page],
    queryFn: () => fetchClassHistoryPage(user!.id, userRole, page),
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const classHistory = result?.data ?? [];
  const totalCount = result?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const handleEditClass = useCallback((classItem: ClassHistoryItem) => {
    setSelectedClass(classItem);
    setEditContent(classItem.Content || '');
    setEditHomework(classItem.HW || '');
    setIsEditDialogOpen(true);
  }, []);

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
      queryClient.invalidateQueries({ queryKey: ['classHistory', user?.id, userRole] });
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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg sm:text-xl font-semibold">Class History</h3>
        <Badge variant="secondary" className="text-xs shrink-0">
          {totalCount} completed
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
        <div className={`space-y-2 ${isPlaceholderData ? 'opacity-60' : ''} transition-opacity`}>
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

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1 || isPlaceholderData}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || isPlaceholderData}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Class Description</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 flex-1 overflow-y-auto">
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
});

ClassHistory.displayName = 'ClassHistory';

export default ClassHistory;
