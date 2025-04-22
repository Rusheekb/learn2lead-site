import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2 } from 'lucide-react';

interface Student {
  id: string;
  name: string;
  subjects: string[];
}

interface Material {
  id: string;
  name: string;
  type: string;
  subject: string;
  dateUploaded: string;
  size: string;
  sharedWith: string[];
}

interface ShareMaterialDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedMaterial: Material | null;
  students: Student[];
  selectedStudents: string[];
  onSelectedStudentsChange: (students: string[]) => void;
  onShareMaterial: () => void;
}

const ShareMaterialDialog: React.FC<ShareMaterialDialogProps> = ({
  isOpen,
  onOpenChange,
  selectedMaterial,
  students,
  selectedStudents,
  onSelectedStudentsChange,
  onShareMaterial,
}) => {
  // Filter out already selected students
  const availableStudents = students.filter(
    (student) => !selectedStudents.includes(student.id)
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Material with Students</DialogTitle>
        </DialogHeader>

        {selectedMaterial && (
          <div className="py-4">
            <div className="bg-gray-50 p-3 rounded-md mb-4">
              <p className="text-sm font-medium">{selectedMaterial.name}</p>
              <p className="text-xs text-gray-500">
                {selectedMaterial.subject} • {selectedMaterial.type}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="select-students">Select Students</Label>
                <Select
                  value="placeholder"
                  onValueChange={(value) => {
                    if (
                      value &&
                      value !== 'placeholder' &&
                      !selectedStudents.includes(value)
                    ) {
                      onSelectedStudentsChange([...selectedStudents, value]);
                    }
                  }}
                >
                  <SelectTrigger id="select-students">
                    <SelectValue placeholder="Add students" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStudents.length > 0 ? (
                      availableStudents.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-students" disabled>
                        All students already selected
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Selected Students:</h4>
                <div className="space-y-2">
                  {selectedStudents.length > 0 ? (
                    selectedStudents.map((studentId) => {
                      const student = students.find((s) => s.id === studentId);
                      return (
                        <div
                          key={studentId}
                          className="flex justify-between items-center bg-gray-50 p-2 rounded"
                        >
                          <span>{student?.name}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              onSelectedStudentsChange(
                                selectedStudents.filter(
                                  (id) => id !== studentId
                                )
                              )
                            }
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-gray-500">
                      No students selected
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onShareMaterial}
            disabled={selectedStudents.length === 0}
          >
            Share Material
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShareMaterialDialog;
