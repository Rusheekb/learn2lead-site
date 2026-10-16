import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ChildFormDialog from '../ChildFormDialog';
import { addChild, updateChild } from '@/services/family/mutations';

jest.mock('@/services/family/mutations', () => ({
  addChild: jest.fn(),
  updateChild: jest.fn(),
}));
jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const renderDialog = (
  props: Partial<React.ComponentProps<typeof ChildFormDialog>> = {}
) => {
  const onOpenChange = jest.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ChildFormDialog open onOpenChange={onOpenChange} {...props} />
    </QueryClientProvider>
  );
  return { onOpenChange };
};

describe('ChildFormDialog', () => {
  beforeEach(() => jest.clearAllMocks());

  it('requires a first name and never calls the server without one', async () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Add student' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Enter the student's first name."
    );
    expect(addChild).not.toHaveBeenCalled();
  });

  it('rejects a malformed optional email', async () => {
    renderDialog();
    fireEvent.change(screen.getByLabelText('First name'), {
      target: { value: 'Maya' },
    });
    fireEvent.change(screen.getByLabelText('Student’s email (optional)'), {
      target: { value: 'not-an-email' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add student' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('valid email');
    expect(addChild).not.toHaveBeenCalled();
  });

  it('adds a student with no email', async () => {
    (addChild as jest.Mock).mockResolvedValue({ success: true });
    const { onOpenChange } = renderDialog();
    fireEvent.change(screen.getByLabelText('First name'), {
      target: { value: ' Maya ' },
    });
    fireEvent.change(screen.getByLabelText('Last name'), {
      target: { value: 'Lee' },
    });
    fireEvent.change(screen.getByLabelText('Grade (optional)'), {
      target: { value: '7' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add student' }));
    await waitFor(() =>
      expect(addChild).toHaveBeenCalledWith({
        firstName: 'Maya',
        lastName: 'Lee',
        grade: '7',
        email: '',
      })
    );
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("shows the server's message when adding fails", async () => {
    (addChild as jest.Mock).mockRejectedValue(
      new Error('That email already has a Learn2Lead account.')
    );
    renderDialog();
    fireEvent.change(screen.getByLabelText('First name'), {
      target: { value: 'Maya' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add student' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'already has a Learn2Lead account'
    );
  });

  it('edits an existing student', async () => {
    (updateChild as jest.Mock).mockResolvedValue(undefined);
    renderDialog({
      child: {
        studentId: 'kid-1',
        firstName: 'Maya',
        lastName: 'Lee',
        grade: '7',
        email: null,
        timezone: null,
        managed: true,
        linkedAt: '2026-10-15',
        hoursVisible: true,
        username: 'test.student',
      },
    });
    expect(screen.getByLabelText('First name')).toHaveValue('Maya');
    fireEvent.change(screen.getByLabelText('Grade (optional)'), {
      target: { value: '8' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(updateChild).toHaveBeenCalledWith('kid-1', {
        firstName: 'Maya',
        lastName: 'Lee',
        grade: '8',
        email: '',
      })
    );
  });
});
