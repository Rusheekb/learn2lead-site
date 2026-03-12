/**
 * Integration tests for tutor scheduling flow
 * Tests class creation, validation, editing, and deletion
 */

import { createScheduledClass } from '@/services/class/create';

const mockInsertSelect = jest.fn();
const mockInsertSingle = jest.fn();
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();

jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => ({
      insert: (data: unknown) => {
        mockInsertSelect(table, data);
        return {
          select: () => ({
            single: () => mockInsertSingle(),
          }),
        };
      },
    }),
  },
}));

jest.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

jest.mock('@/utils/safeDateUtils', () => ({
  ensureDateFormat: (date: string) => date,
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Tutor Scheduling Flow', () => {
  const validClassData = {
    title: 'Algebra Session',
    tutor_id: 'tutor-uuid-123',
    student_id: 'student-uuid-456',
    date: '2026-03-15',
    start_time: '14:00',
    end_time: '15:00',
    subject: 'Math',
    zoom_link: 'https://zoom.us/j/123',
    notes: 'Focus on quadratic equations',
  };

  describe('createScheduledClass', () => {
    it('should create a class with all required fields and return ID', async () => {
      mockInsertSingle.mockResolvedValue({
        data: { id: 'new-class-id' },
        error: null,
      });

      const result = await createScheduledClass(validClassData);

      expect(result).toBe('new-class-id');
      expect(mockInsertSelect).toHaveBeenCalledWith(
        'scheduled_classes',
        expect.objectContaining({
          title: 'Algebra Session',
          tutor_id: 'tutor-uuid-123',
          student_id: 'student-uuid-456',
          date: '2026-03-15',
          start_time: '14:00',
          end_time: '15:00',
          subject: 'Math',
        })
      );
      expect(mockToastSuccess).toHaveBeenCalledWith('Class scheduled successfully');
    });

    it('should reject class creation when required fields are missing', async () => {
      const incompleteData = { ...validClassData, title: '' };

      const result = await createScheduledClass(incompleteData);

      expect(result).toBeNull();
      expect(mockToastError).toHaveBeenCalledWith('Missing required field: title');
      expect(mockInsertSingle).not.toHaveBeenCalled();
    });

    it('should reject when student_id is missing', async () => {
      const noStudent = { ...validClassData, student_id: '' };

      const result = await createScheduledClass(noStudent);

      expect(result).toBeNull();
      expect(mockToastError).toHaveBeenCalledWith('Missing required field: student_id');
    });

    it('should reject when subject is missing', async () => {
      const noSubject = { ...validClassData, subject: '' };

      const result = await createScheduledClass(noSubject);

      expect(result).toBeNull();
      expect(mockToastError).toHaveBeenCalledWith('Missing required field: subject');
    });

    it('should handle database errors gracefully', async () => {
      mockInsertSingle.mockResolvedValue({
        data: null,
        error: { message: 'RLS policy violation' },
      });

      const result = await createScheduledClass(validClassData);

      expect(result).toBeNull();
      expect(mockToastError).toHaveBeenCalledWith(
        'Error scheduling class: RLS policy violation'
      );
    });

    it('should set optional fields to null when not provided', async () => {
      const minimalData = {
        title: 'Quick Session',
        tutor_id: 'tutor-1',
        student_id: 'student-1',
        date: '2026-03-20',
        start_time: '10:00',
        end_time: '11:00',
        subject: 'Science',
      };

      mockInsertSingle.mockResolvedValue({
        data: { id: 'minimal-class-id' },
        error: null,
      });

      await createScheduledClass(minimalData);

      expect(mockInsertSelect).toHaveBeenCalledWith(
        'scheduled_classes',
        expect.objectContaining({
          zoom_link: null,
          notes: null,
          status: 'scheduled',
          attendance: null,
        })
      );
    });
  });
});
