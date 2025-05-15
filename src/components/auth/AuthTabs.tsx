
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SignInForm from './SignInForm';
import SignUpForm from './SignUpForm';
import AuthError from './AuthError';

interface AuthTabsProps {
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  firstName: string;
  setFirstName: (firstName: string) => void;
  lastName: string;
  setLastName: (lastName: string) => void;
  isLoading: boolean;
  authError: string | null;
  handleSignIn: (e: React.FormEvent) => Promise<void>;
  handleSignUp: (e: React.FormEvent) => Promise<void>;
  handleGoogleSignIn: () => Promise<void>;
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
  isLoading,
  authError,
  handleSignIn,
  handleSignUp,
  handleGoogleSignIn
}) => {
  return (
    <Tabs defaultValue="signin" className="w-full">
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
          isLoading={isLoading}
          handleSubmit={handleSignUp}
          handleGoogleSignIn={handleGoogleSignIn}
        />
      </TabsContent>
    </Tabs>
  );
};

export default AuthTabs;
