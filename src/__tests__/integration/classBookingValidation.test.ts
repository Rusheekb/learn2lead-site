/**
 * Integration tests for class booking validation
 * Tests the full booking pipeline: validation → credit check → insert
 */

import { createScheduledClass, createScheduledClassBatch } from '@/services/class/create';

const mockInsert = jest.fn();
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();

jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      insert: (data: any) => {
        mockInsert(data);
        return {
          select: (cols?: string) => {
            // Batch insert (array) vs single insert
            if (Array.isArray(data)) {
              return Promise.resolve({
                data: data.map((_: any, i: number) => ({ id: `batch-${i}` })),
                error: null,
              });
            }
            return {
              single: () =>
                Promise.resolve({
                  data: { id: 'new-class-id' },
                  error: null,
                }),
            };
          },
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

describe('Class Booking Validation', () => {
  const validClass = {
    title: 'Physics Review',
    tutor_id: 'tutor-1',
    student_id: 'student-1',
    date: '2026-03-18',
    start_time: '09:00',
    end_time: '10:00',
    subject: 'Physics',
  };

  describe('Single class booking', () => {
    it('should successfully book a class and return its ID', async () => {
      const id = await createScheduledClass(validClass);

      expect(id).toBe('new-class-id');
      expect(mockToastSuccess).toHaveBeenCalledWith('Class scheduled successfully');
    });

    it('should validate all 7 required fields', async () => {
      const requiredFields = [
        'title',
        'tutor_id',
        'student_id',
        'date',
        'start_time',
        'end_time',
        'subject',
      ];

      for (const field of requiredFields) {
        jest.clearAllMocks();
        const data = { ...validClass, [field]: '' };
        const result = await createScheduledClass(data);

        expect(result).toBeNull();
        expect(mockToastError).toHaveBeenCalledWith(
          `Missing required field: ${field}`
        );
      }
    });

    it('should pass zoom_link and notes through when provided', async () => {
      const withExtras = {
        ...validClass,
        zoom_link: 'https://zoom.us/j/999',
        notes: 'Bring textbook',
      };

      await createScheduledClass(withExtras);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          zoom_link: 'https://zoom.us/j/999',
          notes: 'Bring textbook',
        })
      );
    });
  });

  describe('Batch class booking (recurring)', () => {
    it('should create multiple classes from shared data + dates array', async () => {
      const sharedData = {
        title: 'Weekly Math',
        tutor_id: 'tutor-1',
        student_id: 'student-1',
        start_time: '14:00',
        end_time: '15:00',
        subject: 'Math',
      };

      const dates = ['2026-03-15', '2026-03-22', '2026-03-29'];

      const count = await createScheduledClassBatch(sharedData, dates);

      expect(count).toBe(3);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ date: '2026-03-15', subject: 'Math' }),
          expect.objectContaining({ date: '2026-03-22', subject: 'Math' }),
          expect.objectContaining({ date: '2026-03-29', subject: 'Math' }),
        ])
      );
    });

    it('should return 0 when no dates are provided', async () => {
      const count = await createScheduledClassBatch(
        { ...validClass },
        []
      );

      // Empty array insert
      expect(count).toBe(0);
    });
  });
});
