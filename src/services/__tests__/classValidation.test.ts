import { ClassValidator, ValidationError } from '../classValidation';
import { ClassEvent } from '@/types/tutorTypes';

describe('ClassValidator', () => {
  describe('validateClassCreation', () => {
    const validClassData: Partial<ClassEvent> = {
      title: 'Math Tutoring',
      subject: 'Math',
      studentId: 'student-123',
      relationshipId: 'rel-456',
      date: new Date('2024-12-15'),
      startTime: '14:00',
      endTime: '15:00',
    };

    it('returns empty array for valid class data', () => {
      const errors = ClassValidator.validateClassCreation(validClassData);
      expect(errors).toEqual([]);
    });

    it('returns error for missing title', () => {
      const errors = ClassValidator.validateClassCreation({
        ...validClassData,
        title: '',
      });
      expect(errors).toContainEqual({
        field: 'title',
        message: 'Class title is required',
      });
    });

    it('returns error for whitespace-only title', () => {
      const errors = ClassValidator.validateClassCreation({
        ...validClassData,
        title: '   ',
      });
      expect(errors).toContainEqual({
        field: 'title',
        message: 'Class title is required',
      });
    });

    it('returns error for missing subject', () => {
      const errors = ClassValidator.validateClassCreation({
        ...validClassData,
        subject: '',
      });
      expect(errors).toContainEqual({
        field: 'subject',
        message: 'Subject is required',
      });
    });

    it('returns error for missing studentId', () => {
      const errors = ClassValidator.validateClassCreation({
        ...validClassData,
        studentId: undefined,
      });
      expect(errors).toContainEqual({
        field: 'studentId',
        message: 'Student selection is required',
      });
    });

    it('returns error for missing relationshipId', () => {
      const errors = ClassValidator.validateClassCreation({
        ...validClassData,
        relationshipId: undefined,
      });
      expect(errors).toContainEqual({
        field: 'relationshipId',
        message: 'Valid student relationship is required',
      });
    });

    it('returns error for missing date', () => {
      const errors = ClassValidator.validateClassCreation({
        ...validClassData,
        date: undefined,
      });
      expect(errors).toContainEqual({
        field: 'date',
        message: 'Date is required',
      });
    });

    it('returns error for invalid date', () => {
      const errors = ClassValidator.validateClassCreation({
        ...validClassData,
        date: new Date('invalid'),
      });
      expect(errors).toContainEqual({
        field: 'date',
        message: 'Invalid date',
      });
    });

    it('returns error for missing startTime', () => {
      const errors = ClassValidator.validateClassCreation({
        ...validClassData,
        startTime: '',
      });
      expect(errors).toContainEqual({
        field: 'startTime',
        message: 'Start time is required',
      });
    });

    it('returns error for missing endTime', () => {
      const errors = ClassValidator.validateClassCreation({
        ...validClassData,
        endTime: '',
      });
      expect(errors).toContainEqual({
        field: 'endTime',
        message: 'End time is required',
      });
    });

    it('returns error when end time is before start time', () => {
      const errors = ClassValidator.validateClassCreation({
        ...validClassData,
        startTime: '15:00',
        endTime: '14:00',
      });
      expect(errors).toContainEqual({
        field: 'endTime',
        message: 'End time must be after start time',
      });
    });

    it('returns error when end time equals start time', () => {
      const errors = ClassValidator.validateClassCreation({
        ...validClassData,
        startTime: '14:00',
        endTime: '14:00',
      });
      expect(errors).toContainEqual({
        field: 'endTime',
        message: 'End time must be after start time',
      });
    });

    it('returns error for invalid zoom link URL', () => {
      const errors = ClassValidator.validateClassCreation({
        ...validClassData,
        zoomLink: 'not-a-valid-url',
      });
      expect(errors).toContainEqual({
        field: 'zoomLink',
        message: 'Please enter a valid URL',
      });
    });

    it('accepts valid zoom link URL', () => {
      const errors = ClassValidator.validateClassCreation({
        ...validClassData,
        zoomLink: 'https://zoom.us/j/123456789',
      });
      expect(errors).toEqual([]);
    });

    it('allows empty zoom link', () => {
      const errors = ClassValidator.validateClassCreation({
        ...validClassData,
        zoomLink: '',
      });
      expect(errors).toEqual([]);
    });

    it('returns multiple errors for multiple issues', () => {
      const errors = ClassValidator.validateClassCreation({
        title: '',
        subject: '',
      });
      expect(errors.length).toBeGreaterThan(1);
      expect(errors.some(e => e.field === 'title')).toBe(true);
      expect(errors.some(e => e.field === 'subject')).toBe(true);
    });

    it('handles date string input', () => {
      const errors = ClassValidator.validateClassCreation({
        ...validClassData,
        date: '2024-12-15' as unknown as Date,
      });
      expect(errors).toEqual([]);
    });
  });

  describe('validateClassCompletion', () => {
    const validCompletionData: Partial<ClassEvent> = {
      tutorId: 'tutor-123',
      studentId: 'student-456',
    };

    it('returns empty array for valid completion data', () => {
      const errors = ClassValidator.validateClassCompletion(validCompletionData, 'Covered algebra basics and equations');
      expect(errors).toEqual([]);
    });

    it('returns error for missing content', () => {
      const errors = ClassValidator.validateClassCompletion(validCompletionData, '');
      expect(errors).toContainEqual({
        field: 'content',
        message: 'Class content description is required',
      });
    });

    it('returns error for whitespace-only content', () => {
      const errors = ClassValidator.validateClassCompletion(validCompletionData, '   ');
      expect(errors).toContainEqual({
        field: 'content',
        message: 'Class content description is required',
      });
    });

    it('returns error for content shorter than 10 characters', () => {
      const errors = ClassValidator.validateClassCompletion(validCompletionData, 'Short');
      expect(errors).toContainEqual({
        field: 'content',
        message: 'Please provide a more detailed description (at least 10 characters)',
      });
    });

    it('accepts content exactly 10 characters', () => {
      const errors = ClassValidator.validateClassCompletion(validCompletionData, 'Exactly 10');
      expect(errors).toEqual([]);
    });

    it('returns error for missing tutorId', () => {
      const errors = ClassValidator.validateClassCompletion(
        { studentId: 'student-456' },
        'Valid content here'
      );
      expect(errors).toContainEqual({
        field: 'tutorId',
        message: 'Tutor information is missing',
      });
    });

    it('returns error for missing studentId', () => {
      const errors = ClassValidator.validateClassCompletion(
        { tutorId: 'tutor-123' },
        'Valid content here'
      );
      expect(errors).toContainEqual({
        field: 'studentId',
        message: 'Student information is missing',
      });
    });
  });

  describe('validateClassEdit', () => {
    const validEditData: Partial<ClassEvent> = {
      id: 'class-123',
      title: 'Updated Math Tutoring',
      subject: 'Math',
      date: new Date('2024-12-20'),
      startTime: '16:00',
      endTime: '17:00',
    };

    it('returns empty array for valid edit data', () => {
      const errors = ClassValidator.validateClassEdit(validEditData);
      expect(errors).toEqual([]);
    });

    it('returns error for missing class ID', () => {
      const errors = ClassValidator.validateClassEdit({
        ...validEditData,
        id: undefined,
      });
      expect(errors).toContainEqual({
        field: 'id',
        message: 'Class ID is required for editing',
      });
    });

    it('does not require studentId for edit', () => {
      const errors = ClassValidator.validateClassEdit({
        ...validEditData,
        studentId: undefined,
      });
      // Should not contain studentId error
      expect(errors.find(e => e.field === 'studentId')).toBeUndefined();
    });

    it('does not require relationshipId for edit', () => {
      const errors = ClassValidator.validateClassEdit({
        ...validEditData,
        relationshipId: undefined,
      });
      // Should not contain relationshipId error
      expect(errors.find(e => e.field === 'relationshipId')).toBeUndefined();
    });

    it('still validates title for edit', () => {
      const errors = ClassValidator.validateClassEdit({
        ...validEditData,
        title: '',
      });
      expect(errors).toContainEqual({
        field: 'title',
        message: 'Class title is required',
      });
    });
  });

  describe('formatValidationErrors', () => {
    it('returns empty string for no errors', () => {
      const result = ClassValidator.formatValidationErrors([]);
      expect(result).toBe('');
    });

    it('returns single message for one error', () => {
      const errors: ValidationError[] = [
        { field: 'title', message: 'Title is required' },
      ];
      const result = ClassValidator.formatValidationErrors(errors);
      expect(result).toBe('Title is required');
    });

    it('formats multiple errors as bulleted list', () => {
      const errors: ValidationError[] = [
        { field: 'title', message: 'Title is required' },
        { field: 'subject', message: 'Subject is required' },
      ];
      const result = ClassValidator.formatValidationErrors(errors);
      expect(result).toContain('Please fix the following issues:');
      expect(result).toContain('• Title is required');
      expect(result).toContain('• Subject is required');
    });
  });
});
