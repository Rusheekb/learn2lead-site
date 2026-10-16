import { supabase } from '@/integrations/supabase/client';
import { mockFunctionsInvoke } from '@/setupTests';
import {
  acceptParentInvite,
  addChild,
  adminUnlinkParent,
  becomeFamilyAccount,
  inviteParent,
  previewConvertToFamily,
  updateChild,
} from '../mutations';

const rpc = jest.fn();
beforeAll(() => {
  (supabase as unknown as { rpc: jest.Mock }).rpc = rpc;
});
beforeEach(() => {
  rpc.mockReset();
  mockFunctionsInvoke.mockReset();
});

/** A non-2xx edge-function reply, as supabase-js reports it. */
const httpError = (body: unknown) => ({
  data: null,
  error: {
    message: 'Edge Function returned a non-2xx status code',
    context: { json: () => Promise.resolve(body) },
  },
});

describe('edge-function calls', () => {
  it('adds a child with the form values', async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: { success: true, student: { id: 'kid' } },
      error: null,
    });
    await addChild({ firstName: 'Maya', lastName: 'Lee', grade: '7' });
    expect(mockFunctionsInvoke).toHaveBeenCalledWith('create-managed-student', {
      body: { first_name: 'Maya', last_name: 'Lee', grade: '7', email: '' },
    });
  });

  it("surfaces the function's own message on an error status", async () => {
    mockFunctionsInvoke.mockResolvedValue(
      httpError({ success: false, error: 'That email already has an account.' })
    );
    await expect(
      addChild({ firstName: 'Maya', lastName: 'Lee' })
    ).rejects.toThrow('That email already has an account.');
  });

  it('falls back to a plain message when the body is unreadable', async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: null,
      error: { message: 'x', context: { json: () => Promise.reject() } },
    });
    await expect(inviteParent('a@b.co')).rejects.toThrow(
      'Could not send the invite.'
    );
  });

  it('treats success:false in a 200 reply as an error', async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: { success: false, error: 'This invitation has expired.' },
      error: null,
    });
    await expect(acceptParentInvite('tok')).rejects.toThrow(
      'This invitation has expired.'
    );
  });

  it('returns the dry-run counts', async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: { success: true, would_move: { class_logs: 3 } },
      error: null,
    });
    await expect(previewConvertToFamily('acct')).resolves.toEqual({
      class_logs: 3,
    });
    expect(mockFunctionsInvoke).toHaveBeenCalledWith(
      'admin-convert-to-family',
      {
        body: { account_id: 'acct', dry_run: true },
      }
    );
  });
});

describe('database calls', () => {
  it('becomeFamilyAccount reports the result', async () => {
    rpc.mockResolvedValueOnce({ data: { success: true }, error: null });
    await expect(becomeFamilyAccount()).resolves.toBe(true);
    rpc.mockResolvedValueOnce({
      data: { success: false, error: 'not_eligible' },
      error: null,
    });
    await expect(becomeFamilyAccount()).resolves.toBe(false);
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    await expect(becomeFamilyAccount()).resolves.toBe(false);
  });

  it('updateChild maps server errors to readable messages', async () => {
    rpc.mockResolvedValueOnce({
      data: { success: false, error: 'student_manages_own_details' },
      error: null,
    });
    await expect(
      updateChild('kid', { firstName: 'A', lastName: 'B' })
    ).rejects.toThrow('This student manages their own details');
  });

  it('updateChild sends every field', async () => {
    rpc.mockResolvedValueOnce({ data: { success: true }, error: null });
    await updateChild('kid', {
      firstName: 'Maya',
      lastName: 'Lee',
      grade: '8',
      email: 'maya@x.com',
    });
    expect(rpc).toHaveBeenCalledWith('update_my_child', {
      p_student_id: 'kid',
      p_first_name: 'Maya',
      p_last_name: 'Lee',
      p_grade: '8',
      p_notification_email: 'maya@x.com',
    });
  });

  it('adminUnlinkParent explains why a managed child cannot be unlinked', async () => {
    rpc.mockResolvedValueOnce({
      data: { success: false, error: 'managed_student' },
      error: null,
    });
    await expect(adminUnlinkParent('kid')).rejects.toThrow("can't be unlinked");
  });
});
