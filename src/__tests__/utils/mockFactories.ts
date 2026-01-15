/**
 * Test mock factories for creating consistent test data
 */

import { ClassEvent } from '@/types/tutorTypes';

export interface MockStudent {
  id: string;
  name: string;
  email: string;
  grade?: string;
  subjects: string[];
  active: boolean;
}

export interface MockSubscription {
  id: string;
  student_id: string;
  status: string;
  credits_remaining: number;
  credits_allocated: number;
  plan_name?: string;
  price_per_class?: number;
  is_paused?: boolean;
  pause_resumes_at?: string | null;
}

export interface MockSession {
  user: {
    id: string;
    email: string;
    role?: string;
  };
  access_token: string;
  refresh_token: string;
}

export function createMockStudent(overrides: Partial<MockStudent> = {}): MockStudent {
  return {
    id: 'student-123',
    name: 'Test Student',
    email: 'student@test.com',
    grade: '10th',
    subjects: ['Math', 'Science'],
    active: true,
    ...overrides,
  };
}

export function createMockSubscription(overrides: Partial<MockSubscription> = {}): MockSubscription {
  return {
    id: 'sub-123',
    student_id: 'student-123',
    status: 'active',
    credits_remaining: 10,
    credits_allocated: 12,
    plan_name: 'Standard',
    price_per_class: 20,
    is_paused: false,
    pause_resumes_at: null,
    ...overrides,
  };
}

export function createMockClassEvent(overrides: Partial<ClassEvent> = {}): ClassEvent {
  return {
    id: 'class-123',
    title: 'Math Tutoring Session',
    subject: 'Math',
    date: new Date('2024-12-15'),
    startTime: '14:00',
    endTime: '15:00',
    status: 'scheduled',
    studentId: 'student-123',
    studentName: 'Test Student',
    tutorId: 'tutor-456',
    tutorName: 'Test Tutor',
    relationshipId: 'rel-789',
    zoomLink: 'https://zoom.us/j/123456789',
    notes: 'Focus on algebra',
    ...overrides,
  };
}

export function createMockSession(overrides: Partial<MockSession> = {}): MockSession {
  return {
    user: {
      id: 'user-123',
      email: 'user@test.com',
      role: 'student',
      ...overrides?.user,
    },
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    ...overrides,
  };
}

export function createMockTutor(overrides: Partial<{
  id: string;
  name: string;
  email: string;
  subjects: string[];
  active: boolean;
}> = {}) {
  return {
    id: 'tutor-456',
    name: 'Test Tutor',
    email: 'tutor@test.com',
    subjects: ['Math', 'Science', 'English'],
    active: true,
    ...overrides,
  };
}

export function createMockProfile(overrides: Partial<{
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'student' | 'tutor' | 'admin';
}> = {}) {
  return {
    id: 'profile-123',
    email: 'user@test.com',
    first_name: 'Test',
    last_name: 'User',
    role: 'student' as const,
    ...overrides,
  };
}
