import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { supabase } from '@/integrations/supabase/client';
import AdminFamilySection from '../AdminFamilySection';
import { fetchStudentGuardian } from '@/services/family/fetch';
import {
  adminUnlinkParent,
  convertToFamily,
  previewConvertToFamily,
} from '@/services/family/mutations';

jest.mock('@/services/family/fetch', () => ({
  fetchStudentGuardian: jest.fn(),
}));
jest.mock('@/services/family/mutations', () => ({
  adminUnlinkParent: jest.fn(),
  convertToFamily: jest.fn(),
  previewConvertToFamily: jest.fn(),
}));
jest.mock('@/services/adminActivityLog', () => ({ logAdminAction: jest.fn() }));
jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const rpc = jest.fn();
function mockProfile(profile: Record<string, unknown> | null) {
  (supabase.from as jest.Mock).mockImplementation(() => ({
    select: () => ({
      eq: () => ({
        maybeSingle: () => Promise.resolve({ data: profile, error: null }),
      }),
    }),
  }));
}

beforeAll(() => {
  (supabase as unknown as { rpc: jest.Mock }).rpc = rpc;
});
beforeEach(() => {
  jest.clearAllMocks();
  rpc.mockResolvedValue({ data: 6.5, error: null });
});

const student = {
  id: 'stu-1',
  first_name: 'Kai',
  last_name: 'Giorgio',
  managed: false,
};

describe('AdminFamilySection', () => {
  it('shows the parent and family balance, and unlinks after confirming', async () => {
    mockProfile(student);
    (fetchStudentGuardian as jest.Mock).mockResolvedValue({
      id: 'par-1',
      name: 'Maria Giorgio',
      email: 'maria@example.com',
    });
    (adminUnlinkParent as jest.Mock).mockResolvedValue(undefined);
    render(<AdminFamilySection studentEmail="kai@example.com" />);

    expect(await screen.findByText('Maria Giorgio')).toBeInTheDocument();
    expect(screen.getByText(/Family balance: 6.5 hours/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Unlink parent' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Unlink' }));
    await waitFor(() =>
      expect(adminUnlinkParent).toHaveBeenCalledWith('stu-1')
    );
  });

  it('does not offer unlinking for a child the parent added', async () => {
    mockProfile({ ...student, managed: true });
    (fetchStudentGuardian as jest.Mock).mockResolvedValue({
      id: 'par-1',
      name: 'Maria Giorgio',
      email: 'maria@example.com',
    });
    render(
      <AdminFamilySection studentEmail="student-x@managed.learn2lead.page" />
    );
    expect(
      await screen.findByText(/Added by their parent/)
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Unlink parent' })
    ).not.toBeInTheDocument();
  });

  it('previews, then converts an account into a family', async () => {
    mockProfile(student);
    (fetchStudentGuardian as jest.Mock).mockResolvedValue(null);
    (previewConvertToFamily as jest.Mock).mockResolvedValue({
      tutor_assignments: 1,
      scheduled_classes: 2,
      past_unlogged_classes: 0,
      class_logs: 5,
      tutor_notes: 0,
      shared_files: 0,
      hours_balance: 3,
    });
    (convertToFamily as jest.Mock).mockResolvedValue({ success: true });
    render(<AdminFamilySection studentEmail="kai@example.com" />);

    fireEvent.click(
      await screen.findByRole('button', { name: 'Check what would move' })
    );
    expect(await screen.findByText('5 class logs')).toBeInTheDocument();
    // Student names are pre-filled from the account.
    expect(screen.getByLabelText('Student first name')).toHaveValue('Kai');

    const convert = screen.getByRole('button', {
      name: 'Convert to family account',
    });
    expect(convert).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Parent first name'), {
      target: { value: 'Maria' },
    });
    fireEvent.change(screen.getByLabelText('Parent last name'), {
      target: { value: 'Giorgio' },
    });
    fireEvent.click(convert);
    fireEvent.click(await screen.findByRole('button', { name: 'Convert' }));
    await waitFor(() =>
      expect(convertToFamily).toHaveBeenCalledWith({
        accountId: 'stu-1',
        parentFirstName: 'Maria',
        parentLastName: 'Giorgio',
        childFirstName: 'Kai',
        childLastName: 'Giorgio',
      })
    );
  });
});
