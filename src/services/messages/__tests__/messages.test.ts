import { supabase } from '@/integrations/supabase/client';
import { mockFunctionsInvoke } from '@/setupTests';
import { fetchMyThreads, fetchUnreadMessageCount } from '../fetch';
import { markThreadRead, openThread, sendMessage } from '../mutations';

const rpc = jest.fn();
beforeAll(() => {
  (supabase as unknown as { rpc: jest.Mock }).rpc = rpc;
});
beforeEach(() => {
  rpc.mockReset();
  mockFunctionsInvoke.mockReset();
});

describe('sendMessage', () => {
  it('posts through the send-message function', async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: { success: true, id: 'm1', alerted: 1 },
      error: null,
    });
    await expect(sendMessage('t1', 'Hello')).resolves.toBe('m1');
    expect(mockFunctionsInvoke).toHaveBeenCalledWith('send-message', {
      body: { thread_id: 't1', body: 'Hello' },
    });
  });

  it("surfaces the function's own error message", async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: null,
      error: {
        message: 'Edge Function returned a non-2xx status code',
        context: {
          json: () =>
            Promise.resolve({
              error: "You can't send messages in this conversation.",
            }),
        },
      },
    });
    await expect(sendMessage('t1', 'Hi')).rejects.toThrow(
      "You can't send messages in this conversation."
    );
  });

  it('falls back to a friendly message', async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: null,
      error: { message: 'network', context: {} },
    });
    await expect(sendMessage('t1', 'Hi')).rejects.toThrow(
      'Your message could not be sent. Please try again.'
    );
  });
});

describe('threads', () => {
  it('maps the inbox rows', async () => {
    rpc.mockResolvedValue({
      data: [
        {
          thread_id: 't1',
          student_id: 's1',
          student_name: 'Maya Lee',
          tutor_id: 'u1',
          tutor_name: 'Tara Tutor',
          last_message_at: '2026-10-16T15:00:00Z',
          last_message_preview: 'Hi',
          last_sender_name: 'Pat Lee',
          unread_count: '2',
          can_post: true,
          my_role: 'parent',
        },
      ],
      error: null,
    });
    const [t] = await fetchMyThreads();
    expect(rpc).toHaveBeenCalledWith('get_my_threads');
    expect(t).toMatchObject({
      id: 't1',
      unread: 2,
      canPost: true,
      myRole: 'parent',
      preview: 'Hi',
    });
  });

  it('opens a conversation for a pair', async () => {
    rpc.mockResolvedValue({ data: 't9', error: null });
    await expect(openThread('s1', 'u1')).resolves.toBe('t9');
    expect(rpc).toHaveBeenCalledWith('get_or_create_thread', {
      p_student_id: 's1',
      p_tutor_id: 'u1',
    });
    rpc.mockResolvedValue({ data: null, error: { message: 'Not authorized' } });
    await expect(openThread('s1', 'u2')).rejects.toThrow(
      'Could not open this conversation.'
    );
  });

  it('marks read and counts unread', async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await markThreadRead('t1');
    expect(rpc).toHaveBeenCalledWith('mark_thread_read', { p_thread_id: 't1' });
    rpc.mockResolvedValue({ data: 3, error: null });
    await expect(fetchUnreadMessageCount()).resolves.toBe(3);
  });
});
