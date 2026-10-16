import React, { useEffect, useState } from 'react';
import {
  PASSWORD_HINT,
  USERNAME_HINT,
  suggestUsername,
} from '@/lib/validation';
import {
  USERNAME_STATUS_TEXT,
  useUsernameAvailability,
} from '@/hooks/useUsernameAvailability';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import AuthButton from './AuthButton';
import GoogleAuthButton from './GoogleAuthButton';
import type { GoogleCredential } from '@/lib/googleIdentity';

/** Who the classes are for: the person signing up, or their child(ren). */
export type SignUpAccountType = 'self' | 'parent';

interface SignUpFormProps {
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  firstName: string;
  setFirstName: (firstName: string) => void;
  lastName: string;
  setLastName: (lastName: string) => void;
  username: string;
  setUsername: (username: string) => void;
  isLoading: boolean;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleGoogleSignIn: (credential?: GoogleCredential) => Promise<void>;
  /** Shown only when family sign-up is enabled (see config/features). */
  showAccountType?: boolean;
  accountType?: SignUpAccountType;
  setAccountType?: (type: SignUpAccountType) => void;
}

const SignUpForm: React.FC<SignUpFormProps> = ({
  email,
  setEmail,
  password,
  setPassword,
  firstName,
  setFirstName,
  lastName,
  setLastName,
  username,
  setUsername,
  isLoading,
  handleSubmit,
  handleGoogleSignIn,
  showAccountType = false,
  accountType = 'self',
  setAccountType,
}) => {
  const isParent = showAccountType && accountType === 'parent';
  const usernameStatus = useUsernameAvailability(username);
  const usernameText = USERNAME_STATUS_TEXT[usernameStatus] ?? USERNAME_HINT;
  const usernameBad = ['taken', 'invalid', 'reserved'].includes(usernameStatus);

  // Until the person types their own, suggest a username from their name,
  // stepping to maya.lee2, maya.lee3… if the suggestion is taken.
  const [usernameEdited, setUsernameEdited] = useState(false);
  const [suffix, setSuffix] = useState(1);
  useEffect(() => setSuffix(1), [firstName, lastName]);
  useEffect(() => {
    if (!usernameEdited)
      setUsername(suggestUsername(firstName, lastName, suffix));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstName, lastName, suffix, usernameEdited]);
  // Runs when a check finishes (status changes), never on a stale result:
  // every new suggestion goes back through 'checking' first.
  useEffect(() => {
    if (
      !usernameEdited &&
      (usernameStatus === 'taken' || usernameStatus === 'reserved')
    ) {
      setSuffix((n) => Math.min(n + 1, 50));
    }
  }, [usernameStatus, usernameEdited]);
  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
      aria-label="Create account form"
      noValidate
    >
      {showAccountType && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">
            Who are the classes for?
          </legend>
          <div
            role="radiogroup"
            aria-label="Who are the classes for?"
            className="grid grid-cols-2 gap-2"
          >
            {(
              [
                ['self', 'Me'],
                ['parent', 'My child or children'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={accountType === value}
                onClick={() => setAccountType?.(value)}
                className={`rounded-md border px-3 py-2 text-sm text-left transition-colors ${
                  accountType === value
                    ? 'border-tutoring-blue bg-tutoring-blue/10 font-medium text-tutoring-blue'
                    : 'border-input hover:bg-muted'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {isParent && (
            <p className="text-xs text-muted-foreground">
              Sign up with your own name and email. You’ll add your child (no
              email needed) right after.
            </p>
          )}
        </fieldset>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first-name-signup">
            {isParent ? 'Your First Name' : 'First Name'}
          </Label>
          <Input
            id="first-name-signup"
            type="text"
            placeholder="John"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            minLength={2}
            autoComplete="given-name"
            aria-required="true"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last-name-signup">
            {isParent ? 'Your Last Name' : 'Last Name'}
          </Label>
          <Input
            id="last-name-signup"
            type="text"
            placeholder="Doe"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            minLength={2}
            autoComplete="family-name"
            aria-required="true"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="username-signup">
          {isParent ? 'Your Username' : 'Username'}
        </Label>
        <Input
          id="username-signup"
          type="text"
          placeholder="e.g. jordan.lee"
          value={username}
          onChange={(e) => {
            setUsernameEdited(true);
            setUsername(e.target.value);
          }}
          required
          autoCapitalize="none"
          spellCheck={false}
          autoComplete="username"
          aria-required="true"
          aria-invalid={usernameBad}
          aria-describedby="username-hint"
        />
        <p
          id="username-hint"
          aria-live="polite"
          className={`text-xs ${
            usernameBad
              ? 'text-destructive'
              : usernameStatus === 'available'
                ? 'text-green-600'
                : 'text-muted-foreground'
          }`}
        >
          {usernameStatus === 'available'
            ? 'Available — you can sign in with this or your email.'
            : usernameText}
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email-signup">
          {isParent ? 'Your Email' : 'Email'}
        </Label>
        <Input
          id="email-signup"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          aria-required="true"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password-signup">Password</Label>
        <Input
          id="password-signup"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
          aria-required="true"
          aria-describedby="password-hint"
        />
        <p id="password-hint" className="text-xs text-muted-foreground">
          {PASSWORD_HINT}
        </p>
      </div>
      <AuthButton
        isLoading={isLoading}
        text="Create Account"
        loadingText="Creating Account..."
      />

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <Separator className="w-full" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <GoogleAuthButton
        isLoading={isLoading}
        onSignIn={handleGoogleSignIn}
        text="signup_with"
      />
    </form>
  );
};

export default SignUpForm;
