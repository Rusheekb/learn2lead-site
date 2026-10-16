import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Conversation from '../Conversation';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchThreadMessages,
  fetchThreadParticipants,
} from '@/services/messages/fetch';
import { markThreadRead, sendMessage } from '@/services/messages/mutations';
import type { MessageThread } from '@/services/messages/types';

jest.mock('@/contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('@/services/messages/fetch', () => ({
  fetchThreadMessages: jest.fn(),
  fetchThreadParticipants: jest.fn(),
}));
jest.mock('@/services/messages/mutations', () => ({
  markThreadRead: jest.fn(),
  sendMessage: jest.fn(),
}));
jest.mock('sonner', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

const thread: MessageThread = {
  id: 't1',
  studentId: 's1',
  studentName: 'Maya Lee',
  tutorId: 'u1',
  tutorName: 'Tara Tutor',
  lastMessageAt: '2026-10-16T15:00:00Z',
  preview: 'Hi',
  lastSenderName: 'Pat Lee',
  unread: 1,
  canPost: true,
  myRole: 'tutor',
};

const renderConversation = (t: MessageThread = thread) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <Conversation thread={t} />
    </QueryClientProvider>
  );

describe('Conversation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ user: { id: 'u1' } });
    (fetchThreadMessages as jest.Mock).mockResolvedValue([
      {
        id: 'm1',
        senderId: 'p1',
        senderName: 'Pat Lee',
        senderRole: 'parent',
        body: 'Can we move Thursday?',
        createdAt: new Date().toISOString(),
      },
    ]);
    (fetchThreadParticipants as jest.Mock).mockResolvedValue([
      { profileId: 'u1', name: 'Tara Tutor', role: 'tutor' },
      { profileId: 's1', name: 'Maya Lee', role: 'student' },
      { profileId: 'p1', name: 'Pat Lee', role: 'parent' },
    ]);
    (markThreadRead as jest.Mock).mockResolvedValue(undefined);
    (sendMessage as jest.Mock).mockResolvedValue('m2');
  });

  it('shows the messages, who sent them, and who can see them', async () => {
    renderConversation();
    expect(
      await screen.findByText('Can we move Thursday?')
    ).toBeInTheDocument();
    expect(screen.getByText('Pat Lee')).toBeInTheDocument();
    expect(
      await screen.findByText(
        'Shared with you, Maya Lee (student) and Pat Lee (parent). Learn2Lead staff can also see it.'
      )
    ).toBeInTheDocument();
  });

  it('marks the conversation read when opened', async () => {
    renderConversation();
    await waitFor(() => expect(markThreadRead).toHaveBeenCalledWith('t1'));
  });

  it('sends on Enter, keeps Shift+Enter for new lines', async () => {
    renderConversation();
    const box = await screen.findByLabelText('Message');
    fireEvent.change(box, { target: { value: 'Sure, Friday works.' } });
    fireEvent.keyDown(box, { key: 'Enter', shiftKey: true });
    expect(sendMessage).not.toHaveBeenCalled();
    fireEvent.keyDown(box, { key: 'Enter' });
    await waitFor(() =>
      expect(sendMessage).toHaveBeenCalledWith('t1', 'Sure, Friday works.')
    );
    await waitFor(() => expect(box).toHaveValue(''));
  });

  it("doesn't send blank messages", async () => {
    renderConversation();
    const box = await screen.findByLabelText('Message');
    fireEvent.change(box, { target: { value: '   ' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(sendMessage).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
  });

  it('is read-only after the match ends', async () => {
    renderConversation({ ...thread, canPost: false });
    expect(
      await screen.findByText(/no longer matched with Maya/)
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Message')).not.toBeInTheDocument();
  });
});
