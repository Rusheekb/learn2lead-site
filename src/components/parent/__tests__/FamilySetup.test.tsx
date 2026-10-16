import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FamilySetup from '../FamilySetup';
import { addChild } from '@/services/family/mutations';
import type { FamilyChild } from '@/services/family/types';

jest.mock('@/services/family/mutations', () => ({
  addChild: jest.fn(),
  updateChild: jest.fn(),
}));
jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const arjun: FamilyChild = {
  studentId: 'kid-1',
  firstName: 'Arjun',
  lastName: 'Patel',
  grade: '6',
  email: null,
  timezone: null,
  managed: true,
  linkedAt: '2026-10-16',
  hoursVisible: true,
  username: 'test.student',
};

const renderSetup = (
  props: Partial<React.ComponentProps<typeof FamilySetup>> = {}
) => {
  const onStep = jest.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <FamilySetup
          parentFirstName="Nina"
          step="students"
          onStep={onStep}
          students={[]}
          hoursAvailable={0}
          {...props}
        />
      </MemoryRouter>
    </QueryClientProvider>
  );
  return { onStep };
};

describe('FamilySetup', () => {
  beforeEach(() => jest.clearAllMocks());

  it('welcomes the parent and asks for a student first', () => {
    renderSetup();
    expect(
      screen.getByText(/Welcome, Nina! Let’s set up your family./)
    ).toBeInTheDocument();
    expect(screen.getByText('Who’s getting tutoring?')).toBeInTheDocument();
    // No way forward until a student is added.
    expect(
      screen.queryByRole('button', { name: 'Continue' })
    ).not.toBeInTheDocument();
  });

  it('adds a student from the inline form', async () => {
    (addChild as jest.Mock).mockResolvedValue({ success: true });
    renderSetup();
    fireEvent.change(screen.getByLabelText('First name'), {
      target: { value: 'Arjun' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add student' }));
    await waitFor(() =>
      expect(addChild).toHaveBeenCalledWith(
        expect.objectContaining({ firstName: 'Arjun' })
      )
    );
  });

  it('continues to hours once a student exists', async () => {
    const { onStep } = renderSetup({ students: [arjun] });
    expect(screen.getByText('Arjun Patel')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(onStep).toHaveBeenCalledWith('hours'));
  });

  it('lets the parent buy hours or skip for now', () => {
    const { onStep } = renderSetup({ step: 'hours', students: [arjun] });
    expect(
      screen.getByRole('link', { name: 'Choose an hour pack' })
    ).toHaveAttribute('href', '/pricing');
    fireEvent.click(screen.getByRole('button', { name: 'I’ll do this later' }));
    expect(onStep).toHaveBeenCalledWith('next');
  });

  it('acknowledges hours already bought', () => {
    renderSetup({ step: 'hours', students: [arjun], hoursAvailable: 8 });
    expect(
      screen.getByText(/You have 8 hours ready to use/)
    ).toBeInTheDocument();
  });

  it('explains what happens next, naming the students', () => {
    const { onStep } = renderSetup({ step: 'next', students: [arjun] });
    expect(
      screen.getByText(/We’ll match Arjun with a tutor/)
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Go to my family dashboard' })
    );
    expect(onStep).toHaveBeenCalledWith('done');
  });
});
