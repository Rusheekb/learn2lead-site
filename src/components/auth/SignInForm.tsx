
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import AuthButton from './AuthButton';
import SocialAuthButton from './SocialAuthButton';
import GoogleIcon from './GoogleIcon';

interface SignInFormProps {
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  isLoading: boolean;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleGoogleSignIn: () => Promise<void>;
}

const SignInForm: React.FC<SignInFormProps> = ({
  email,
  setEmail,
  password,
  setPassword,
  isLoading,
  handleSubmit,
  handleGoogleSignIn
}) => {
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email-signin">Email</Label>
        <Input
          id="email-signin"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password-signin">Password</Label>
        <Input
          id="password-signin"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <AuthButton
        isLoading={isLoading}
        text="Sign In"
        loadingText="Signing In..."
      />

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <Separator className="w-full" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <SocialAuthButton
        provider="Google"
        isLoading={isLoading}
        onClick={handleGoogleSignIn}
        icon={<GoogleIcon />}
      />
    </form>
  );
};

export default SignInForm;
