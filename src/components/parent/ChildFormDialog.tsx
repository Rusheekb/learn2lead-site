import React, { useEffect } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { FamilyChild } from '@/services/family/types';
import { ChildFormFields } from './ChildForm';
import { useChildForm } from './useChildForm';

interface ChildFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Edit this child; add a new one when omitted. */
  child?: FamilyChild;
}

/** Add a student to the family, or edit one the parent added. */
const ChildFormDialog: React.FC<ChildFormDialogProps> = ({
  open,
  onOpenChange,
  child,
}) => {
  const form = useChildForm(child);
  const { reset } = form;

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const saved = await form.submit();
    if (saved === null) return;
    toast.success(child ? 'Saved' : `${saved} was added to your family`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>
              {child ? 'Edit student' : 'Add a student'}
            </DialogTitle>
            <DialogDescription>
              {child
                ? 'Update their details.'
                : 'They don’t need an email or a login — you’ll get their class reminders and updates.'}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <ChildFormFields
              values={form.values}
              setField={form.setField}
              error={form.error}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={form.isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={form.isSaving}>
              {form.isSaving ? 'Saving…' : child ? 'Save' : 'Add student'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ChildFormDialog;
