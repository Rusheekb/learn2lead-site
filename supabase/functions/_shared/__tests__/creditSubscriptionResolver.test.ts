import { resolveOrCreateSubscriptionId } from '../creditSubscriptionResolver';

function createFakeSupabase({
  existingSub,
  insertResult,
}: {
  existingSub: { id: string } | null;
  insertResult?: { data: { id: string } | null; error: unknown };
}) {
  const insert = jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      single: jest
        .fn()
        .mockResolvedValue(
          insertResult ?? { data: { id: 'new-sub-id' }, error: null }
        ),
    }),
  });

  const select = jest.fn().mockReturnValue({
    eq: jest.fn().mockReturnValue({
      in: jest.fn().mockReturnValue({
        maybeSingle: jest
          .fn()
          .mockResolvedValue({ data: existingSub, error: null }),
      }),
    }),
  });

  return {
    from: jest.fn().mockReturnValue({ select, insert }),
    insert,
    select,
  };
}

describe('resolveOrCreateSubscriptionId', () => {
  it('reuses an existing active/trialing subscription without inserting', async () => {
    const supabaseAdmin = createFakeSupabase({
      existingSub: { id: 'existing-sub-id' },
    });

    const result = await resolveOrCreateSubscriptionId(
      supabaseAdmin,
      'student-1'
    );

    expect(result).toEqual({
      subscriptionId: 'existing-sub-id',
      created: false,
    });
    expect(supabaseAdmin.insert).not.toHaveBeenCalled();
  });

  it('bootstraps a new subscription when the student has none (Zelle-only student)', async () => {
    const supabaseAdmin = createFakeSupabase({ existingSub: null });

    const result = await resolveOrCreateSubscriptionId(
      supabaseAdmin,
      'student-2'
    );

    expect(result).toEqual({ subscriptionId: 'new-sub-id', created: true });
    expect(supabaseAdmin.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        student_id: 'student-2',
        status: 'active',
        credits_remaining: 0,
      })
    );
  });

  it('throws instead of silently 404ing when bootstrap insert fails', async () => {
    const supabaseAdmin = createFakeSupabase({
      existingSub: null,
      insertResult: { data: null, error: new Error('insert failed') },
    });

    await expect(
      resolveOrCreateSubscriptionId(supabaseAdmin, 'student-3')
    ).rejects.toThrow('Failed to bootstrap subscription record');
  });
});
