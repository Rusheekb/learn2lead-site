import { ClassEvent } from '@/types/tutorTypes';

export interface FormValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export class FormValidator {
  static validateClassForm(formData: Partial<ClassEvent>): FormValidationResult {
    const errors: Record<string, string> = {};

    // Required field validation
    if (!formData.title?.trim()) {
      errors.title = 'Title is required';
    }

    if (!formData.subject?.trim()) {
      errors.subject = 'Subject is required';
    }

    if (!formData.studentId) {
      errors.studentId = 'Student selection is required';
    }

    if (!formData.relationshipId) {
      errors.relationshipId = 'Valid student relationship is required';
    }

    if (!formData.date) {
      errors.date = 'Date is required';
    }

    if (!formData.startTime) {
      errors.startTime = 'Start time is required';
    }

    if (!formData.endTime) {
      errors.endTime = 'End time is required';
    }

    // Time validation
    if (formData.startTime && formData.endTime) {
      const [startHour, startMin] = formData.startTime.split(':').map(Number);
      const [endHour, endMin] = formData.endTime.split(':').map(Number);
      
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      
      if (endMinutes <= startMinutes) {
        errors.endTime = 'End time must be after start time';
      }
    }

    // URL validation for zoom link
    if (formData.zoomLink && formData.zoomLink.trim()) {
      try {
        new URL(formData.zoomLink);
      } catch {
        errors.zoomLink = 'Please enter a valid URL';
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  static getFieldError(errors: Record<string, string>, fieldName: string): string | undefined {
    return errors[fieldName];
  }

  static hasFieldError(errors: Record<string, string>, fieldName: string): boolean {
    return !!errors[fieldName];
  }
}