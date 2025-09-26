import { ClassEvent } from '@/types/tutorTypes';
import { parse, isFuture, isValid } from 'date-fns';

export interface ValidationError {
  field: string;
  message: string;
}

export class ClassValidator {
  static validateClassCreation(classData: Partial<ClassEvent>): ValidationError[] {
    const errors: ValidationError[] = [];

    // Required field validation
    if (!classData.title?.trim()) {
      errors.push({ field: 'title', message: 'Class title is required' });
    }

    if (!classData.subject?.trim()) {
      errors.push({ field: 'subject', message: 'Subject is required' });
    }

    if (!classData.studentId) {
      errors.push({ field: 'studentId', message: 'Student selection is required' });
    }

    if (!classData.relationshipId) {
      errors.push({ field: 'relationshipId', message: 'Valid student relationship is required' });
    }

    if (!classData.startTime) {
      errors.push({ field: 'startTime', message: 'Start time is required' });
    }

    if (!classData.endTime) {
      errors.push({ field: 'endTime', message: 'End time is required' });
    }

    // Date validation
    if (classData.date) {
      const classDate = classData.date instanceof Date ? classData.date : new Date(classData.date);
      if (!isValid(classDate)) {
        errors.push({ field: 'date', message: 'Invalid date' });
      }
    } else {
      errors.push({ field: 'date', message: 'Date is required' });
    }

    // Time validation
    if (classData.startTime && classData.endTime) {
      try {
        const startTime = parse(classData.startTime, 'HH:mm', new Date());
        const endTime = parse(classData.endTime, 'HH:mm', new Date());
        
        if (!isValid(startTime) || !isValid(endTime)) {
          errors.push({ field: 'time', message: 'Invalid time format' });
        } else if (endTime <= startTime) {
          errors.push({ field: 'endTime', message: 'End time must be after start time' });
        }
      } catch (error) {
        errors.push({ field: 'time', message: 'Invalid time format' });
      }
    }

    // URL validation
    if (classData.zoomLink && classData.zoomLink.trim()) {
      try {
        new URL(classData.zoomLink);
      } catch (error) {
        errors.push({ field: 'zoomLink', message: 'Please enter a valid URL' });
      }
    }

    return errors;
  }

  static validateClassCompletion(classData: Partial<ClassEvent>, content: string): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!content?.trim()) {
      errors.push({ field: 'content', message: 'Class content description is required' });
    }

    if (content && content.trim().length < 10) {
      errors.push({ field: 'content', message: 'Please provide a more detailed description (at least 10 characters)' });
    }

    if (!classData.tutorId) {
      errors.push({ field: 'tutorId', message: 'Tutor information is missing' });
    }

    if (!classData.studentId) {
      errors.push({ field: 'studentId', message: 'Student information is missing' });
    }

    return errors;
  }

  static validateClassEdit(classData: Partial<ClassEvent>): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!classData.id) {
      errors.push({ field: 'id', message: 'Class ID is required for editing' });
    }

    // Use the same validation as creation for the editable fields
    const creationErrors = this.validateClassCreation(classData);
    
    // Filter out errors for fields that might not be present during edit
    return creationErrors.filter(error => 
      !['studentId', 'relationshipId'].includes(error.field)
    );
  }

  static formatValidationErrors(errors: ValidationError[]): string {
    if (errors.length === 0) return '';
    
    if (errors.length === 1) {
      return errors[0].message;
    }
    
    return `Please fix the following issues:\n${errors.map(e => `• ${e.message}`).join('\n')}`;
  }
}