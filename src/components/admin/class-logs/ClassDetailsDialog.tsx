import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StudentContent } from '@/components/shared/StudentContent.tsx';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

import { format } from 'date-fns';
import { FileText, ExternalLink, Pencil, Save } from 'lucide-react';
import { parseDateToLocal } from '@/utils/safeDateUtils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ClassDetailsDialogProps {
  isDetailsOpen: boolean;
  setIsDetailsOpen: (open: boolean) => void;
  selectedClass: any;
  activeDetailsTab: string;
  setActiveDetailsTab: (tab: string) => void;
  studentUploads: any[];
  studentMessages: any[];
  handleDownloadFile: (uploadId: string) => Promise<void>;
  formatTime: (time: string) => string;
  studentPaymentMethod?: string;
  onToggleStudentPayment?: (classId: string, currentlyPaid: boolean) => void;
  onToggleTutorPayment?: (classId: string, currentlyPaid: boolean) => void;
  onCostsUpdated?: () => void;
}

const ClassDetailsDialog: React.FC<ClassDetailsDialogProps> = ({
  isDetailsOpen,
  setIsDetailsOpen,
  selectedClass,
  activeDetailsTab,
  setActiveDetailsTab,
  studentUploads,
  studentMessages,
  handleDownloadFile,
  formatTime,
  studentPaymentMethod,
  onToggleStudentPayment,
  onToggleTutorPayment,
  onCostsUpdated,
}) => {
  const [editingCosts, setEditingCosts] = useState(false);
  const [classCost, setClassCost] = useState('');
  const [tutorCost, setTutorCost] = useState('');
  const [savingCosts, setSavingCosts] = useState(false);

  useEffect(() => {
    if (selectedClass) {
      setClassCost(selectedClass.classCost?.toString() || '0');
      setTutorCost(selectedClass.tutorCost?.toString() || '0');
      setEditingCosts(false);
    }
  }, [selectedClass]);

  if (!selectedClass) return null;

  const handleSaveCosts = async () => {
    setSavingCosts(true);
    try {
      const { error } = await supabase
        .from('class_logs')
        .update({
          'Class Cost': parseFloat(classCost) || 0,
          'Tutor Cost': parseFloat(tutorCost) || 0,
        })
        .eq('id', selectedClass.id);

      if (error) throw error;
      toast.success('Costs updated');
      setEditingCosts(false);
      onCostsUpdated?.();
    } catch (err: any) {
      toast.error(`Failed to update costs: ${err.message}`);
    } finally {
      setSavingCosts(false);
    }
  };
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'Date not available';
    try {
      const dateObj = parseDateToLocal(date);
      if (isNaN(dateObj.getTime())) return 'Invalid date';
      return format(dateObj, 'MMM d, yyyy');
    } catch (e) {
      console.error('Error formatting date:', e);
      return String(date);
    }
  };
  
  const getFilenameFromUrl = (url: string) => {
    const parts = url.split('/');
    const filename = parts[parts.length - 1].split('?')[0];
    const decodedFilename = decodeURIComponent(filename);
    const matches = decodedFilename.match(/[^\/]+\.[^\/\.]+$/);
    return matches ? matches[0] : decodedFilename;
  };

  const isStripe = studentPaymentMethod === 'stripe';
  const studentPaid = !!selectedClass.studentPaymentDate;
  const tutorPaid = !!selectedClass.tutorPaymentDate;

  return (
    <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <div className="flex flex-col h-full max-h-[calc(90vh-4rem)]">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{selectedClass?.title}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4">
            <Tabs value={activeDetailsTab} onValueChange={setActiveDetailsTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="payments">Payments</TabsTrigger>
                <TabsTrigger value="materials">Materials</TabsTrigger>
                <TabsTrigger value="student-content">Student</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4 pt-4">
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Subject</h4>
                    <p className="text-foreground">{selectedClass.subject}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Tutor</h4>
                    <p className="text-foreground">{selectedClass.tutorName}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Student</h4>
                    <p className="text-foreground">{selectedClass.studentName}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Date</h4>
                    <p className="text-foreground">{formatDate(selectedClass.date)}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Time</h4>
                    <p className="text-foreground">
                      {formatTime(selectedClass.startTime)} -{' '}
                      {formatTime(selectedClass.endTime)}
                    </p>
                  </div>
                </div>

                {selectedClass.zoomLink && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Zoom Link</h4>
                    <a
                      href={selectedClass.zoomLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {selectedClass.zoomLink}
                    </a>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Content Covered</h4>
                  <p className="mt-1 text-foreground whitespace-pre-wrap">
                    {selectedClass.content || 'No content recorded for this class.'}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Homework / Follow-up</h4>
                  <p className="mt-1 text-foreground whitespace-pre-wrap">
                    {selectedClass.homework || 'No homework assigned.'}
                  </p>
                </div>

                {selectedClass.notes && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Additional Notes</h4>
                    <p className="mt-1 text-foreground whitespace-pre-wrap">
                      {selectedClass.notes}
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="payments" className="space-y-6 pt-4">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Payment Method:</h4>
                  <Badge variant={isStripe ? 'default' : 'secondary'}>
                    {isStripe ? 'Stripe' : 'Zelle'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Costs</span>
                  {editingCosts ? (
                    <Button size="sm" variant="default" onClick={handleSaveCosts} disabled={savingCosts}>
                      <Save className="h-3 w-3 mr-1" />
                      {savingCosts ? 'Saving…' : 'Save'}
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => setEditingCosts(true)}>
                      <Pencil className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg border border-border">
                    <div className="text-sm text-muted-foreground">Class Cost</div>
                    {editingCosts ? (
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-lg font-bold">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={classCost}
                          onChange={(e) => setClassCost(e.target.value)}
                          className="h-8 text-lg font-bold"
                        />
                      </div>
                    ) : (
                      <div className="text-xl font-bold">${parseFloat(classCost).toFixed(2)}</div>
                    )}
                  </div>
                  <div className="p-3 rounded-lg border border-border">
                    <div className="text-sm text-muted-foreground">Tutor Cost</div>
                    {editingCosts ? (
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-lg font-bold">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={tutorCost}
                          onChange={(e) => setTutorCost(e.target.value)}
                          className="h-8 text-lg font-bold"
                        />
                      </div>
                    ) : (
                      <div className="text-xl font-bold">${parseFloat(tutorCost).toFixed(2)}</div>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Student Payment</h4>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${studentPaid ? 'bg-emerald-500' : 'bg-destructive'}`} />
                      <span className="text-sm font-medium">
                        {studentPaid ? 'Paid' : 'Unpaid'}
                      </span>
                    </div>
                  </div>
                  {isStripe ? (
                    <p className="text-sm text-muted-foreground">Managed by Stripe — no manual action needed.</p>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {studentPaid && selectedClass.studentPaymentDate
                          ? `Paid on ${format(selectedClass.studentPaymentDate, 'M/d/yy')}`
                          : 'Not yet received'}
                      </span>
                      {onToggleStudentPayment && (
                        <Button
                          size="sm"
                          variant={studentPaid ? 'outline' : 'default'}
                          onClick={() => onToggleStudentPayment(selectedClass.id, studentPaid)}
                        >
                          {studentPaid ? 'Mark Unpaid' : 'Mark Paid'}
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-lg border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Tutor Payment</h4>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${tutorPaid ? 'bg-emerald-500' : 'bg-destructive'}`} />
                      <span className="text-sm font-medium">
                        {tutorPaid ? 'Paid' : 'Unpaid'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {tutorPaid && selectedClass.tutorPaymentDate
                        ? `Paid on ${format(selectedClass.tutorPaymentDate, 'M/d/yy')}`
                        : 'Not yet paid'}
                    </span>
                    {onToggleTutorPayment && (
                      <Button
                        size="sm"
                        variant={tutorPaid ? 'outline' : 'default'}
                        onClick={() => onToggleTutorPayment(selectedClass.id, tutorPaid)}
                      >
                        {tutorPaid ? 'Mark Unpaid' : 'Mark Paid'}
                      </Button>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="materials" className="space-y-4 pt-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Class Materials</h4>
                  {selectedClass.materialsUrl && selectedClass.materialsUrl.length > 0 ? (
                    <ul className="mt-2 space-y-2">
                      {selectedClass.materialsUrl.map((url: string, index: number) => (
                        <li key={index} className="p-2 border border-border rounded-md">
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            <span>{getFilenameFromUrl(url)}</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground mt-2">No materials uploaded for this class.</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="student-content" className="space-y-4 pt-4">
                <StudentContent
                  classId={selectedClass.id}
                  uploads={studentUploads}
                  onDownload={handleDownloadFile}
                />
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter className="flex-shrink-0 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClassDetailsDialog;
