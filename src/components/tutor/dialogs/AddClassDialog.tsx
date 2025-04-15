
import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import NewClassEventForm from "../NewClassEventForm";

interface AddClassDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  newEvent: any;
  setNewEvent: (event: any) => void;
  students: any[];
  onCreateEvent: () => void;
  onResetForm: () => void;
}

const AddClassDialog: React.FC<AddClassDialogProps> = ({
  isOpen,
  setIsOpen,
  newEvent,
  setNewEvent,
  students,
  onCreateEvent,
  onResetForm,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Schedule New Class</DialogTitle>
        </DialogHeader>
        
        <NewClassEventForm 
          newEvent={newEvent}
          setNewEvent={setNewEvent}
          students={students}
        />
        
        <DialogFooter className="pt-2">
          <div className="flex gap-2 justify-end w-full">
            <Button variant="outline" onClick={() => {
              setIsOpen(false);
              onResetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={onCreateEvent} className="bg-tutoring-blue hover:bg-tutoring-blue/90">
              Schedule Class
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddClassDialog;
