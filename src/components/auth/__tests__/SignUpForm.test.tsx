import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import SignUpForm from '../SignUpForm';

const baseProps = {
  email: '',
  setEmail: jest.fn(),
  password: '',
  setPassword: jest.fn(),
  firstName: '',
  setFirstName: jest.fn(),
  lastName: '',
  setLastName: jest.fn(),
  username: '',
  setUsername: jest.fn(),
  isLoading: false,
  handleSubmit: jest.fn(),
  handleGoogleSignIn: jest.fn(),
};

describe('SignUpForm — family accounts', () => {
  it('hides the "who are the classes for" choice by default (flag off)', () => {
    render(<SignUpForm {...baseProps} />);
    expect(
      screen.queryByText('Who are the classes for?')
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('First Name')).toBeInTheDocument();
  });

  it('offers Me / My child when enabled and reports the choice', () => {
    const setAccountType = jest.fn();
    render(
      <SignUpForm
        {...baseProps}
        showAccountType
        accountType="self"
        setAccountType={setAccountType}
      />
    );
    const child = screen.getByRole('radio', { name: 'My child or children' });
    expect(screen.getByRole('radio', { name: 'Me' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    fireEvent.click(child);
    expect(setAccountType).toHaveBeenCalledWith('parent');
  });

  it('asks a parent for their own details', () => {
    render(<SignUpForm {...baseProps} showAccountType accountType="parent" />);
    expect(screen.getByLabelText('Your First Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Your Email')).toBeInTheDocument();
    expect(
      screen.getByText(/You’ll add your child \(no email needed\)/)
    ).toBeInTheDocument();
  });
});

describe('SignUpForm — suggested username', () => {
  /** The form with real state, the way Login uses it. */
  const Stateful = () => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [username, setUsername] = useState('');
    return (
      <SignUpForm
        {...baseProps}
        firstName={firstName}
        setFirstName={setFirstName}
        lastName={lastName}
        setLastName={setLastName}
        username={username}
        setUsername={setUsername}
      />
    );
  };

  it('suggests one from the name until the person types their own', () => {
    render(<Stateful />);
    const box = screen.getByLabelText('Username');
    fireEvent.change(screen.getByLabelText('First Name'), {
      target: { value: 'Nina' },
    });
    fireEvent.change(screen.getByLabelText('Last Name'), {
      target: { value: 'Patel' },
    });
    expect(box).toHaveValue('nina.patel');

    fireEvent.change(box, { target: { value: 'ninap' } });
    fireEvent.change(screen.getByLabelText('Last Name'), {
      target: { value: 'Shah' },
    });
    expect(box).toHaveValue('ninap');
  });
});
