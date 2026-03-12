import { z } from 'zod';

// ─── Shared error messages ──────────────────────────────────────────────────
export const validationMessages = {
  required: (field: string) => `${field} is required`,
  minLength: (field: string, min: number) =>
    `${field} must be at least ${min} characters`,
  maxLength: (field: string, max: number) =>
    `${field} must be less than ${max} characters`,
  email: 'Please enter a valid email address',
  url: 'Please enter a valid URL',
  password: 'Password must be at least 6 characters',
  positiveNumber: (field: string) => `${field} must be a positive number`,
} as const;

// ─── Reusable field schemas ─────────────────────────────────────────────────
export const fields = {
  name: (label = 'Name') =>
    z
      .string()
      .trim()
      .min(1, { message: validationMessages.required(label) })
      .max(100, { message: validationMessages.maxLength(label, 100) }),

  shortName: (label = 'Name') =>
    z
      .string()
      .trim()
      .min(2, { message: validationMessages.minLength(label, 2) })
      .max(50, { message: validationMessages.maxLength(label, 50) }),

  email: () =>
    z
      .string()
      .trim()
      .min(1, { message: validationMessages.required('Email') })
      .email({ message: validationMessages.email })
      .max(255, { message: validationMessages.maxLength('Email', 255) }),

  password: () =>
    z
      .string()
      .min(6, { message: validationMessages.password }),

  url: (label = 'URL', optional = false) => {
    const base = z.string().url({ message: validationMessages.url });
    return optional ? base.or(z.literal('')) : base;
  },

  text: (label: string, { min = 1, max = 1000 } = {}) =>
    z
      .string()
      .trim()
      .min(min, { message: min === 1 ? validationMessages.required(label) : validationMessages.minLength(label, min) })
      .max(max, { message: validationMessages.maxLength(label, max) }),

  optionalText: (label: string, max = 1000) =>
    z.string().max(max, { message: validationMessages.maxLength(label, max) }).optional().or(z.literal('')),

  positiveNumber: (label: string) =>
    z
      .string()
      .refine((val) => !isNaN(Number(val)), { message: `${label} must be a number` })
      .refine((val) => Number(val) >= 0, { message: validationMessages.positiveNumber(label) }),
} as const;

// ─── Composite schemas ──────────────────────────────────────────────────────

export const signInSchema = z.object({
  email: fields.email(),
  password: z.string().min(1, { message: validationMessages.required('Password') }),
});

export const signUpSchema = z.object({
  firstName: fields.shortName('First name'),
  lastName: fields.shortName('Last name'),
  email: fields.email(),
  password: fields.password(),
});

export const contactSchema = z.object({
  name: fields.name(),
  email: fields.email(),
  subject: fields.text('Subject', { max: 200 }),
  message: fields.text('Message', { min: 10, max: 2000 }),
});

export const profileSchema = z.object({
  first_name: fields.shortName('First name').or(z.literal('')),
  last_name: fields.shortName('Last name').or(z.literal('')),
  bio: fields.optionalText('Bio', 500),
  zoom_link: fields.url('Zoom link', true),
});

export const tutorSchema = z.object({
  name: fields.name(),
  email: fields.email(),
  subjects: fields.text('Subjects'),
  hourlyRate: fields.positiveNumber('Hourly rate'),
});

export const studentSchema = z.object({
  name: fields.name(),
  email: fields.email(),
  grade: fields.text('Grade'),
  subjects: fields.text('Subjects'),
  paymentMethod: z.enum(['stripe', 'zelle']),
  classRate: z.string().optional(),
});

export const assignmentSchema = z.object({
  tutorId: z.string().min(1, validationMessages.required('Tutor')),
  studentId: z.string().min(1, validationMessages.required('Student')),
});

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Extract first error message from a ZodError */
export const getFirstError = (error: z.ZodError): string =>
  error.errors[0]?.message ?? 'Validation failed';

/** Validate data and return { success, data, errors } */
export function validateForm<T extends z.ZodSchema>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; errors: Record<string, string>; firstError: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errors: Record<string, string> = {};
  for (const err of result.error.errors) {
    const key = err.path.join('.');
    if (!errors[key]) errors[key] = err.message;
  }
  return { success: false, errors, firstError: getFirstError(result.error) };
}
