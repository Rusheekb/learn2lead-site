import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Save, X } from 'lucide-react';
import { format, parse } from 'date-fns';
import { ClassEvent } from '@/types/tutorTypes';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { ErrorHandler } from '@/services/errorHandling';

interface EditClassDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  classEvent: ClassEvent | null;
  onUpdate: () => void;
}

const EditClassDialog: React.FC<EditClassDialogProps> = ({
  isOpen,
  setIsOpen,
  classEvent,
  onUpdate
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    date: new Date(),
    startTime: '',
    endTime: '',
    subject: '',
    zoomLink: '',
    notes: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (classEvent && isOpen) {
      const eventDate = classEvent.date instanceof Date 
        ? classEvent.date 
        : new Date(classEvent.date);
        
      setFormData({
        title: classEvent.title || '',
        date: eventDate,
        startTime: classEvent.startTime || '',
        endTime: classEvent.endTime || '',
        subject: classEvent.subject || '',
        zoomLink: classEvent.zoomLink || '',
        notes: classEvent.notes || ''
      });
      setErrors({});
    }
  }, [classEvent, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required';
    }

    if (!formData.endTime) {
      newErrors.endTime = 'End time is required';
    }

    if (formData.startTime && formData.endTime) {
      const start = parse(formData.startTime, 'HH:mm', new Date());
      const end = parse(formData.endTime, 'HH:mm', new Date());
      
      if (end <= start) {
        newErrors.endTime = 'End time must be after start time';
      }
    }

    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }

    if (formData.zoomLink && !formData.zoomLink.startsWith('http')) {
      newErrors.zoomLink = 'Please enter a valid URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!classEvent || !user?.id) return;

    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('scheduled_classes')
        .update({
          title: formData.title.trim(),
          date: format(formData.date, 'yyyy-MM-dd'),
          start_time: formData.startTime,
          end_time: formData.endTime,
          subject: formData.subject.trim(),
          zoom_link: formData.zoomLink || null,
          notes: formData.notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', classEvent.id)
        .eq('tutor_id', user.id); // Ensure only tutor can edit their classes

      if (error) {
        throw error;
      }

      // Invalidate relevant queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['scheduledClasses', user.id] }),
        queryClient.invalidateQueries({ queryKey: ['upcomingClasses'] }),
        queryClient.refetchQueries({ queryKey: ['scheduledClasses', user.id] })
      ]);

      toast.success('Class updated successfully');
      setIsOpen(false);
      onUpdate();
    } catch (error) {
      ErrorHandler.handle(error, 'EditClassDialog.handleSubmit');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    setErrors({});
  };

  if (!classEvent) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Class</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Class Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter class title"
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title}</p>}
          </div>

          <div>
            <Label>Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(formData.date, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.date}
                  onSelect={(date) => date && setFormData(prev => ({ ...prev, date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startTime">Start Time *</Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                className={errors.startTime ? 'border-red-500' : ''}
              />
              {errors.startTime && <p className="text-sm text-red-500 mt-1">{errors.startTime}</p>}
            </div>

            <div>
              <Label htmlFor="endTime">End Time *</Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                className={errors.endTime ? 'border-red-500' : ''}
              />
              {errors.endTime && <p className="text-sm text-red-500 mt-1">{errors.endTime}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="Enter subject"
              className={errors.subject ? 'border-red-500' : ''}
            />
            {errors.subject && <p className="text-sm text-red-500 mt-1">{errors.subject}</p>}
          </div>

          <div>
            <Label htmlFor="zoomLink">Zoom Link</Label>
            <Input
              id="zoomLink"
              value={formData.zoomLink}
              onChange={(e) => setFormData(prev => ({ ...prev, zoomLink: e.target.value }))}
              placeholder="https://zoom.us/..."
              className={errors.zoomLink ? 'border-red-500' : ''}
            />
            {errors.zoomLink && <p className="text-sm text-red-500 mt-1">{errors.zoomLink}</p>}
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditClassDialog;