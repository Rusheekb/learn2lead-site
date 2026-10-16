import type { MessageThread } from '@/services/messages/types';
import {
  dayLabel,
  listTime,
  pairLabel,
  threadSubtitle,
  threadTitle,
  visibilityNote,
} from '../threadDisplay';

const thread = (myRole: MessageThread['myRole']): MessageThread => ({
  id: 't1',
  studentId: 's1',
  studentName: 'Maya Lee',
  tutorId: 'u1',
  tutorName: 'Tara Tutor',
  lastMessageAt: null,
  preview: null,
  lastSenderName: null,
  unread: 0,
  canPost: true,
  myRole,
});

describe('threadTitle / threadSubtitle', () => {
  it.each([
    ['student', 'Tara Tutor', 'Your tutor'],
    ['tutor', 'Maya Lee', 'Your student'],
    ['parent', 'Maya · Tara Tutor', 'Maya’s tutor'],
    ['staff', 'Maya Lee · Tara Tutor', 'Student and tutor'],
  ] as const)('for a %s', (role, title, subtitle) => {
    expect(threadTitle(thread(role))).toBe(title);
    expect(threadSubtitle(thread(role))).toBe(subtitle);
  });
});

describe('pairLabel', () => {
  const pair = {
    studentId: 's1',
    studentName: 'Maya Lee',
    tutorId: 'u1',
    tutorName: 'Tara Tutor',
  };
  it('shows each person the other side', () => {
    expect(pairLabel(pair, 'student')).toEqual({
      title: 'Tara Tutor',
      detail: 'Tutor',
    });
    expect(pairLabel(pair, 'tutor')).toEqual({
      title: 'Maya Lee',
      detail: 'Student',
    });
    expect(pairLabel(pair, 'parent')).toEqual({
      title: 'Tara Tutor',
      detail: 'Maya’s tutor',
    });
    expect(pairLabel(pair, 'admin')).toEqual({
      title: 'Maya Lee',
      detail: 'with Tara Tutor',
    });
  });
});

describe('visibilityNote', () => {
  it('lists you first, then student, parent, tutor', () => {
    expect(
      visibilityNote(
        [
          { profileId: 'u1', name: 'Tara Tutor', role: 'tutor' },
          { profileId: 'p1', name: 'Pat Lee', role: 'parent' },
          { profileId: 's1', name: 'Maya Lee', role: 'student' },
        ],
        'u1'
      )
    ).toBe(
      'Shared with you, Maya Lee (student) and Pat Lee (parent). Learn2Lead staff can also see it.'
    );
  });

  it('handles an admin viewing (not a participant)', () => {
    expect(
      visibilityNote(
        [
          { profileId: 's1', name: 'Al Adult', role: 'student' },
          { profileId: 'u1', name: 'Tara Tutor', role: 'tutor' },
        ],
        'admin'
      )
    ).toBe(
      'Shared with Al Adult (student) and Tara Tutor (tutor). Learn2Lead staff can also see it.'
    );
    expect(visibilityNote([], 'x')).toBe(
      'Learn2Lead staff can see this conversation.'
    );
  });
});

describe('times', () => {
  const now = new Date(2026, 9, 16, 15, 0); // Fri Oct 16 2026, 3 PM local
  it('list times get coarser with age', () => {
    expect(listTime(null, now)).toBe('');
    expect(listTime(new Date(2026, 9, 16, 9, 5).toISOString(), now)).toBe(
      '9:05 AM'
    );
    expect(listTime(new Date(2026, 9, 13, 9, 5).toISOString(), now)).toBe(
      'Tue'
    );
    expect(listTime(new Date(2026, 6, 4).toISOString(), now)).toBe('Jul 4');
    expect(listTime(new Date(2025, 6, 4).toISOString(), now)).toBe(
      'Jul 4, 2025'
    );
  });

  it('day dividers', () => {
    expect(dayLabel(new Date(2026, 9, 16, 1).toISOString(), now)).toBe('Today');
    expect(dayLabel(new Date(2026, 9, 15, 23).toISOString(), now)).toBe(
      'Yesterday'
    );
    expect(dayLabel(new Date(2026, 9, 12).toISOString(), now)).toBe(
      'Monday, Oct 12'
    );
  });
});
