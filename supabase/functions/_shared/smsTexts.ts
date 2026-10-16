/**
 * Wording for text messages. Short (one or two segments), always says who
 * it's from, and ends with the opt-out notice. Pure, for Jest.
 */
/** Footer every text carries (carrier requirement for opt-out notice). */
export const SMS_FOOTER = 'Reply STOP to opt out.';

const fmtHours = (n: number) => `${n} hour${n === 1 ? '' : 's'}`;

/** "Maya's" for a parent, "Your" for the student. */
const whose = (isGuardian: boolean, studentFirstName: string) =>
  isGuardian ? `${studentFirstName || 'Your child'}'s` : 'Your';

export function reminderText(a: {
  isGuardian: boolean;
  studentFirstName: string;
  subject: string;
  time: string;
  tutorName: string;
  zoomLink?: string | null;
}): string {
  return `Learn2Lead: ${whose(a.isGuardian, a.studentFirstName)} ${a.subject} class is tomorrow at ${a.time} with ${a.tutorName}.${a.zoomLink ? ` Zoom: ${a.zoomLink}` : ''} ${SMS_FOOTER}`;
}

export function tutorReminderText(a: {
  studentName: string;
  subject: string;
  time: string;
}): string {
  return `Learn2Lead: Session with ${a.studentName} (${a.subject}) tomorrow at ${a.time}. ${SMS_FOOTER}`;
}

export function classLoggedText(a: {
  isGuardian: boolean;
  studentFirstName: string;
  subject: string;
  homework?: string | null;
}): string {
  const hw = a.homework ? ` Homework: ${a.homework}` : '';
  return `Learn2Lead: ${whose(a.isGuardian, a.studentFirstName)} ${a.subject} class notes are ready.${hw} ${SMS_FOOTER}`;
}

export function lowHoursText(hoursLeft: number): string {
  return `Learn2Lead: Your tutoring balance is down to ${fmtHours(hoursLeft)}. Add hours at learn2lead.page/pricing ${SMS_FOOTER}`;
}

export function outOfHoursText(): string {
  return `Learn2Lead: You're out of tutoring hours, so upcoming classes can't be logged. Add hours at learn2lead.page/pricing ${SMS_FOOTER}`;
}

export function newMessageText(a: {
  senderName: string;
  aboutStudent?: string | null;
  preview: string;
}): string {
  const about = a.aboutStudent ? ` about ${a.aboutStudent}` : '';
  const preview =
    a.preview.length > 80 ? `${a.preview.slice(0, 79).trimEnd()}…` : a.preview;
  return `Learn2Lead: New message from ${a.senderName}${about}: "${preview}" Open learn2lead.page to reply. ${SMS_FOOTER}`;
}

export function tutorAssignedText(a: {
  isGuardian: boolean;
  studentFirstName: string;
  tutorName: string;
}): string {
  const who = a.isGuardian ? a.studentFirstName || 'Your child' : 'You';
  return `Learn2Lead: ${who} ${a.isGuardian ? 'has' : 'have'} been paired with tutor ${a.tutorName}. They'll schedule the first class soon. ${SMS_FOOTER}`;
}
