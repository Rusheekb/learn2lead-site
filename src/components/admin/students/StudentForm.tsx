import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DialogFooter } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Student } from './StudentTable';

interface StudentFormProps {
  onAddStudent: (student: Omit<Student, 'id'>) => void;
}

const StudentForm: React.FC<StudentFormProps> = ({ onAddStudent }) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const newStudent = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      grade: formData.get('grade') as string,
      subjects: (formData.get('subjects') as string)
        .split(',')
        .map((s) => s.trim()),
      status: 'active' as const,
      enrollDate: new Date().toISOString().split('T')[0],
      lastSession: 'N/A',
      paymentStatus: 'paid' as const,
    };

    onAddStudent(newStudent);
    (e.target as HTMLFormElement).reset();
  };

  return (
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
          <label htmlFor="grade" className="text-sm font-medium">
            Grade Level
          </label>
          <Select name="grade" required defaultValue="9th Grade">
            <SelectTrigger>
              <SelectValue placeholder="Select grade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="9th Grade">9th Grade</SelectItem>
              <SelectItem value="10th Grade">10th Grade</SelectItem>
              <SelectItem value="11th Grade">11th Grade</SelectItem>
              <SelectItem value="12th Grade">12th Grade</SelectItem>
            </SelectContent>
          </Select>
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
      </div>
      <DialogFooter>
        <Button type="submit">Add Student</Button>
      </DialogFooter>
    </form>
  );
};

export default StudentForm;
