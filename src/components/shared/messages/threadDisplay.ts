import {
  format,
  isSameDay,
  isSameYear,
  differenceInCalendarDays,
} from 'date-fns';
import type {
  MessageablePair,
  MessageThread,
  ThreadParticipant,
  ThreadRole,
} from '@/services/messages/types';

/** Display helpers for messaging. Pure, so they're easy to test. */

const firstName = (name: string) => name.split(' ')[0] || name;

/** What a conversation is called in the signed-in person's list. */
export function threadTitle(t: MessageThread): string {
  switch (t.myRole) {
    case 'student':
      return t.tutorName;
    case 'tutor':
      return t.studentName;
    case 'parent':
      return `${firstName(t.studentName)} · ${t.tutorName}`;
    default:
      return `${t.studentName} · ${t.tutorName}`;
  }
}

/** The line under the title. */
export function threadSubtitle(t: MessageThread): string {
  switch (t.myRole) {
    case 'student':
      return 'Your tutor';
    case 'tutor':
      return 'Your student';
    case 'parent':
      return `${firstName(t.studentName)}’s tutor`;
    default:
      return 'Student and tutor';
  }
}

/** How a pair reads in the "New message" picker. */
export function pairLabel(
  pair: MessageablePair,
  role: string | null | undefined
): { title: string; detail: string } {
  if (role === 'student') return { title: pair.tutorName, detail: 'Tutor' };
  if (role === 'tutor') return { title: pair.studentName, detail: 'Student' };
  if (role === 'parent') {
    return {
      title: pair.tutorName,
      detail: `${firstName(pair.studentName)}’s tutor`,
    };
  }
  return { title: pair.studentName, detail: `with ${pair.tutorName}` };
}

export const ROLE_LABEL: Record<ThreadRole, string> = {
  student: 'Student',
  tutor: 'Tutor',
  parent: 'Parent',
  staff: 'Learn2Lead',
  former: 'Former member',
};

/**
 * "Shared with you, Maya Lee (student) and Tara Tutor (tutor). Learn2Lead
 * staff can also see it."
 */
export function visibilityNote(
  participants: ThreadParticipant[],
  myId: string | undefined
): string {
  const order: ThreadRole[] = ['student', 'parent', 'tutor'];
  const rank = (p: ThreadParticipant) =>
    p.profileId === myId ? -1 : order.indexOf(p.role);
  const names = [...participants]
    .sort((a, b) => rank(a) - rank(b))
    .map((p) =>
      p.profileId === myId
        ? 'you'
        : `${p.name} (${ROLE_LABEL[p.role].toLowerCase()})`
    );
  if (names.length === 0) return 'Learn2Lead staff can see this conversation.';
  const list =
    names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return `Shared with ${list}. Learn2Lead staff can also see it.`;
}

/** "3:05 PM" today, "Mon" this week, "Oct 3" this year, else "Oct 3, 2025". */
export function listTime(iso: string | null, now = new Date()): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isSameDay(d, now)) return format(d, 'h:mm a');
  if (differenceInCalendarDays(now, d) < 7) return format(d, 'EEE');
  if (isSameYear(d, now)) return format(d, 'MMM d');
  return format(d, 'MMM d, yyyy');
}

/** Day divider in a conversation: "Today", "Yesterday", "Monday, Oct 3". */
export function dayLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const days = differenceInCalendarDays(now, d);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return format(d, isSameYear(d, now) ? 'EEEE, MMM d' : 'EEEE, MMM d, yyyy');
}

export const MAX_MESSAGE_LENGTH = 4000;
