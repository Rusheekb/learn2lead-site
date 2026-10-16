import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SignInForm from './SignInForm';
import SignUpForm from './SignUpForm';
import AuthError from './AuthError';
import ForgotPasswordForm from './ForgotPasswordForm';
import type { GoogleCredential } from '@/lib/googleIdentity';
import type { SignUpAccountType } from './SignUpForm';

interface AuthTabsProps {
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
  authError: string | null;
  handleSignIn: (e: React.FormEvent) => Promise<void>;
  handleSignUp: (e: React.FormEvent) => Promise<void>;
  handleGoogleSignIn: (credential?: GoogleCredential) => Promise<void>;
  /** Google from the sign-up tab (carries the account-type choice). */
  handleGoogleSignUp?: (credential?: GoogleCredential) => Promise<void>;
  defaultTab?: 'signin' | 'signup';
  showAccountType?: boolean;
  accountType?: SignUpAccountType;
  setAccountType?: (type: SignUpAccountType) => void;
}

const AuthTabs: React.FC<AuthTabsProps> = ({
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
  authError,
  handleSignIn,
  handleSignUp,
  handleGoogleSignIn,
  handleGoogleSignUp,
  defaultTab = 'signin',
  showAccountType,
  accountType,
  setAccountType,
}) => {
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  if (showForgotPassword) {
    return <ForgotPasswordForm onBack={() => setShowForgotPassword(false)} />;
  }

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="signin">Sign In</TabsTrigger>
        <TabsTrigger value="signup">Sign Up</TabsTrigger>
      </TabsList>

      {authError && <AuthError error={authError} />}

      <TabsContent value="signin">
        <SignInForm
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          isLoading={isLoading}
          handleSubmit={handleSignIn}
          handleGoogleSignIn={handleGoogleSignIn}
          onForgotPassword={() => setShowForgotPassword(true)}
        />
      </TabsContent>

      <TabsContent value="signup">
        <SignUpForm
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          firstName={firstName}
          setFirstName={setFirstName}
          lastName={lastName}
          setLastName={setLastName}
          username={username}
          setUsername={setUsername}
          isLoading={isLoading}
          handleSubmit={handleSignUp}
          handleGoogleSignIn={handleGoogleSignUp ?? handleGoogleSignIn}
          showAccountType={showAccountType}
          accountType={accountType}
          setAccountType={setAccountType}
        />
      </TabsContent>
    </Tabs>
  );
};

export default AuthTabs;
