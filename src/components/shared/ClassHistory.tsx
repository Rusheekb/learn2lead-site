import React, { useState, memo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Clock,
  BookOpen,
  Edit3,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Loader2,
  Star,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { parseDateToLocal } from '@/utils/safeDateUtils';
import { ClassHistorySkeleton } from '@/components/shared/skeletons';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';

const log = logger.create('ClassHistory');

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
  student_rating: number | null;
  student_feedback: string | null;
}

interface ClassHistoryProps {
  userRole: 'student' | 'tutor' | 'admin';
  collapsible?: boolean;
}

interface PendingFeedback {
  rating: number;
  feedback: string;
}

const PAGE_SIZE = 20;

// RLS on class_logs now handles access filtering (name match OR uuid match).
// No explicit UUID filter needed — RLS returns exactly the rows the user owns.
const fetchClassHistoryPage = async (
  _userId: string,
  _userRole: string,
  page: number
): Promise<{ data: ClassHistoryItem[]; totalCount: number }> => {
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error, count } = await supabase
    .from('class_logs')
    .select('*', { count: 'exact' })
    .order('Date', { ascending: false })
    .order('"Time (CST)"', { ascending: false })
    .range(from, to);

  if (error) throw error;
  return { data: (data as ClassHistoryItem[]) || [], totalCount: count || 0 };
};

const StarRating: React.FC<{
  rating: number;
  onRate?: (r: number) => void;
  readonly?: boolean;
}> = ({ rating, onRate, readonly = false }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        disabled={readonly}
        onClick={() => onRate?.(star)}
        className={cn(
          'text-xl leading-none transition-colors',
          star <= rating ? 'text-yellow-400' : 'text-muted-foreground/25',
          !readonly && 'hover:text-yellow-400 cursor-pointer',
          readonly && 'cursor-default'
        )}
      >
        ★
      </button>
    ))}
  </div>
);

const ClassHistory: React.FC<ClassHistoryProps> = memo(
  ({ userRole, collapsible = false }) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [isExpanded, setIsExpanded] = useState(!collapsible);
    const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [selectedClass, setSelectedClass] = useState<ClassHistoryItem | null>(
      null
    );
    const [editContent, setEditContent] = useState('');
    const [editHomework, setEditHomework] = useState('');
    const [pendingFeedback, setPendingFeedback] = useState<
      Record<string, PendingFeedback>
    >({});
    const [savingRatingId, setSavingRatingId] = useState<string | null>(null);

    const {
      data: result,
      isLoading,
      isPlaceholderData,
      isError,
      refetch,
    } = useQuery({
      queryKey: ['classHistory', user?.id, userRole, page],
      queryFn: () => fetchClassHistoryPage(user!.id, userRole, page),
      enabled: !!user?.id,
      staleTime: 2 * 60 * 1000,
      placeholderData: (prev) => prev,
      retry: 1,
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
          .update({ Content: editContent, HW: editHomework })
          .eq('id', selectedClass.id);
        if (error) throw error;
        toast.success('Class description updated');
        setIsEditDialogOpen(false);
        queryClient.invalidateQueries({
          queryKey: ['classHistory', user?.id, userRole],
        });
      } catch (error) {
        log.error('Error updating class', error);
        toast.error('Failed to update class description');
      }
    };

    const handleSaveRating = async (classId: string) => {
      const pending = pendingFeedback[classId];
      if (!pending?.rating) return;
      setSavingRatingId(classId);
      try {
        const { error } = await supabase
          .from('class_logs')
          .update({
            student_rating: pending.rating,
            student_feedback: pending.feedback.trim() || null,
          })
          .eq('id', classId);
        if (error) throw error;
        toast.success('Feedback saved');
        queryClient.invalidateQueries({
          queryKey: ['classHistory', user?.id, userRole],
        });
        setPendingFeedback((prev) => {
          const next = { ...prev };
          delete next[classId];
          return next;
        });
      } catch (err) {
        log.error('Error saving rating', err);
        toast.error('Failed to save feedback');
      } finally {
        setSavingRatingId(null);
      }
    };

    const editDialog = (
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
              <Button onClick={handleSaveEdit}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );

    const listContent = (
      <>
        {isLoading ? (
          <ClassHistorySkeleton count={3} />
        ) : isError ? (
          <Card>
            <CardContent className="text-center py-8 space-y-3">
              <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
              <p className="text-sm font-medium">
                Failed to load class history
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Try again
              </Button>
            </CardContent>
          </Card>
        ) : classHistory.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No completed classes yet</p>
            </CardContent>
          </Card>
        ) : (
          <div
            className={`space-y-2 ${isPlaceholderData ? 'opacity-60' : ''} transition-opacity`}
          >
            {classHistory.map((classItem) => {
              const isItemExpanded = expandedClassId === classItem.id;
              const pending = pendingFeedback[classItem.id];
              const hasRating = !!classItem.student_rating;
              const isEditing = !!pending;

              return (
                <Card
                  key={classItem.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() =>
                    setExpandedClassId(isItemExpanded ? null : classItem.id)
                  }
                >
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">
                            {classItem['Class Number'] || 'Untitled'}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {classItem.Subject || 'Unknown'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(
                              parseDateToLocal(classItem.Date),
                              'MMM d, yyyy'
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {userRole === 'student'
                              ? classItem['Tutor Name'] || 'Unknown Tutor'
                              : classItem['Student Name'] || 'Unknown Student'}
                          </span>
                          {userRole === 'tutor' && hasRating && (
                            <span className="flex items-center gap-0.5 text-xs text-yellow-500">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              {classItem.student_rating}/5
                            </span>
                          )}
                        </div>
                      </div>
                      {(userRole === 'tutor' || userRole === 'admin') && (
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

                    {isItemExpanded && (
                      <div className="mt-3 pt-3 border-t space-y-3">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {classItem['Time (CST)'] || 'Unknown time'} (
                            {classItem['Time (hrs)'] || '0'}h)
                          </div>
                        </div>

                        {classItem.Content && (
                          <div>
                            <h4 className="font-medium text-sm mb-1">
                              What was covered:
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {classItem.Content}
                            </p>
                          </div>
                        )}

                        {classItem.HW && (
                          <div>
                            <h4 className="font-medium text-sm mb-1">
                              Homework assigned:
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {classItem.HW}
                            </p>
                          </div>
                        )}

                        {classItem['Additional Info'] && (
                          <div>
                            <h4 className="font-medium text-sm mb-1">
                              Additional notes:
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {classItem['Additional Info']}
                            </p>
                          </div>
                        )}

                        {/* Student rating section */}
                        {userRole === 'student' && (
                          <div
                            className="pt-2 border-t"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {hasRating && !isEditing ? (
                              <div className="flex items-center gap-2 flex-wrap">
                                <StarRating
                                  rating={classItem.student_rating!}
                                  readonly
                                />
                                <span className="text-xs text-muted-foreground">
                                  Your rating
                                </span>
                                {classItem.student_feedback && (
                                  <span className="text-xs text-muted-foreground italic truncate max-w-[200px]">
                                    "{classItem.student_feedback}"
                                  </span>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 text-xs px-2"
                                  onClick={() =>
                                    setPendingFeedback((prev) => ({
                                      ...prev,
                                      [classItem.id]: {
                                        rating: classItem.student_rating!,
                                        feedback:
                                          classItem.student_feedback || '',
                                      },
                                    }))
                                  }
                                >
                                  Edit
                                </Button>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground">
                                  {isEditing
                                    ? 'Edit your feedback'
                                    : 'How was this session?'}
                                </p>
                                <StarRating
                                  rating={pending?.rating ?? 0}
                                  onRate={(r) =>
                                    setPendingFeedback((prev) => ({
                                      ...prev,
                                      [classItem.id]: {
                                        rating: r,
                                        feedback:
                                          prev[classItem.id]?.feedback || '',
                                      },
                                    }))
                                  }
                                />
                                {(pending?.rating ?? 0) > 0 && (
                                  <>
                                    <Textarea
                                      placeholder="Leave a note for your tutor (optional)..."
                                      value={pending?.feedback || ''}
                                      onChange={(e) =>
                                        setPendingFeedback((prev) => ({
                                          ...prev,
                                          [classItem.id]: {
                                            ...prev[classItem.id],
                                            feedback: e.target.value,
                                          },
                                        }))
                                      }
                                      rows={2}
                                      className="text-sm"
                                    />
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        onClick={() =>
                                          handleSaveRating(classItem.id)
                                        }
                                        disabled={
                                          savingRatingId === classItem.id
                                        }
                                      >
                                        {savingRatingId === classItem.id && (
                                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                        )}
                                        Save Feedback
                                      </Button>
                                      {isEditing && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() =>
                                            setPendingFeedback((prev) => {
                                              const next = { ...prev };
                                              delete next[classItem.id];
                                              return next;
                                            })
                                          }
                                        >
                                          Cancel
                                        </Button>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Tutor view: show student rating if exists */}
                        {userRole === 'tutor' && hasRating && (
                          <div className="pt-2 border-t">
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              Student feedback
                            </p>
                            <div className="flex items-center gap-2">
                              <StarRating
                                rating={classItem.student_rating!}
                                readonly
                              />
                            </div>
                            {classItem.student_feedback && (
                              <p className="text-sm text-muted-foreground mt-1 italic">
                                "{classItem.student_feedback}"
                              </p>
                            )}
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
      </>
    );

    if (collapsible) {
      return (
        <>
          <div className="rounded-xl border bg-card overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors text-left"
              onClick={() => setIsExpanded((e) => !e)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-semibold">Class History</span>
                {!isLoading && totalCount > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({totalCount} completed)
                  </span>
                )}
              </div>
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200',
                  isExpanded && 'rotate-180'
                )}
              />
            </button>

            {isExpanded && (
              <div className="border-t p-4 space-y-3">{listContent}</div>
            )}
          </div>
          {editDialog}
        </>
      );
    }

    if (isLoading) {
      return <ClassHistorySkeleton count={5} />;
    }

    return (
      <>
        <div className="space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg sm:text-xl font-semibold">Class History</h3>
            <Badge variant="secondary" className="text-xs shrink-0">
              {totalCount} completed
            </Badge>
          </div>
          {listContent}
        </div>
        {editDialog}
      </>
    );
  }
);

ClassHistory.displayName = 'ClassHistory';

export default ClassHistory;
