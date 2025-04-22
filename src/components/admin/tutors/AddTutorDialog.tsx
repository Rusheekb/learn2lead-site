import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Tutor } from '@/types/tutorTypes';

interface AddTutorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddTutor: (tutor: Tutor) => void;
}

const AddTutorDialog: React.FC<AddTutorDialogProps> = ({
  open,
  onOpenChange,
  onAddTutor,
}) => {
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newTutor = {
      id: Date.now().toString(),
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      subjects: (formData.get('subjects') as string)
        .split(',')
        .map((s) => s.trim()),
      rating: 5,
      classes: 0,
      hourlyRate: parseInt((formData.get('hourlyRate') as string) || '0'),
    };

    onAddTutor(newTutor);
    toast({
      title: 'Tutor Added',
      description: 'New tutor has been successfully added to the system.',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Tutor</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="name" className="text-sm font-medium">
                Full Name
              </label>
              <Input id="name" name="name" required placeholder="John Smith" />
            </div>
            <div className="grid gap-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="john.smith@example.com"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="subjects" className="text-sm font-medium">
                Subjects (comma-separated)
              </label>
              <Input
                id="subjects"
                name="subjects"
                required
                placeholder="Mathematics, Physics, Chemistry"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="hourlyRate" className="text-sm font-medium">
                Hourly Rate ($)
              </label>
              <Input
                id="hourlyRate"
                name="hourlyRate"
                type="number"
                min="0"
                required
                placeholder="50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Add Tutor</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTutorDialog;
