/** Messaging (docs/family-accounts-plan.md, Phase D). */

/** The part someone plays in a conversation. */
export type ThreadRole = 'student' | 'tutor' | 'parent' | 'staff' | 'former';

/** One student + tutor conversation, as the signed-in person sees it. */
export interface MessageThread {
  id: string;
  studentId: string;
  studentName: string;
  tutorId: string;
  tutorName: string;
  lastMessageAt: string | null;
  preview: string | null;
  lastSenderName: string | null;
  unread: number;
  /** false once the tutor and student are no longer matched */
  canPost: boolean;
  myRole: ThreadRole;
}

export interface ThreadMessage {
  id: string;
  senderId: string | null;
  senderName: string;
  senderRole: ThreadRole;
  body: string;
  createdAt: string;
}

export interface ThreadParticipant {
  profileId: string;
  name: string;
  role: ThreadRole;
}

/** A student + tutor pair the signed-in person can start a conversation for. */
export interface MessageablePair {
  studentId: string;
  studentName: string;
  tutorId: string;
  tutorName: string;
}
