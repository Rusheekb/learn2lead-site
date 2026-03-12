
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import NavBar from '@/components/NavBar';
import AuthTabs from '@/components/auth/AuthTabs';
import { getSavedRoute } from '@/hooks/useRoutePersistence';
import { signInSchema, signUpSchema, validateForm } from '@/lib/validation';
import { addBreadcrumb, captureException } from '@/lib/sentry';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, signInWithOAuth, user, userRole } = useAuth();
  const navigate = useNavigate();
  const [authError, setAuthError] = useState<string | null>(null);

  // Check for OAuth error in URL parameters
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const error = queryParams.get('error');
    const errorDescription = queryParams.get('error_description');
    
    if (error) {
      const errorMsg = errorDescription || 'An error occurred during authentication';
      setAuthError(errorMsg);
      toast.error(errorMsg);
      addBreadcrumb({
        category: 'auth',
        message: `OAuth callback error: ${error}`,
        level: 'warning',
        data: { error, errorDescription },
      });
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (user && userRole) {
      const savedRoute = getSavedRoute(user.id);
      
      const redirectPaths = {
        student: '/dashboard',
        tutor: '/tutor-dashboard',
        admin: '/admin-dashboard',
      };

      const path = savedRoute || redirectPaths[userRole] || '/';
      navigate(path, { replace: true });
    }
  }, [user, userRole, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const result = validateForm(signInSchema, { email, password });
    if (!result.success) {
      toast.error(result.firstError);
      return;
    }

    setIsLoading(true);

    try {
      await signIn(result.data.email, result.data.password);
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof Error) {
        setAuthError(error.message);
        captureException(error, { context: 'handleSignIn' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const result = validateForm(signUpSchema, { firstName, lastName, email, password });
    if (!result.success) {
      toast.error(result.firstError);
      return;
    }

    setIsLoading(true);

    try {
      await signUp(result.data.email, result.data.password, {
        first_name: result.data.firstName,
        last_name: result.data.lastName,
      });
      toast.success('Account created! Please check your email for verification.');
    } catch (error) {
      console.error('Registration error:', error);
      if (error instanceof Error) {
        setAuthError(error.message);
        captureException(error, { context: 'handleSignUp' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setAuthError(null);
    
    try {
      await signInWithOAuth('google');
    } catch (error) {
      console.error('Google sign in error:', error);
      if (error instanceof Error) {
        setAuthError(error.message);
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      <main id="main-content" tabIndex={-1} className="container mx-auto px-4 pt-20 pb-10 focus:outline-none">
        <div className="max-w-md mx-auto">
          <h1 className="text-3xl font-bold text-center mb-8 text-tutoring-blue">
            Welcome to Learn<span className="text-tutoring-teal">2</span>Lead
          </h1>

          <Card>
            <CardHeader>
              <CardTitle className="text-center">Sign In or Register</CardTitle>
            </CardHeader>
            <CardContent>
              <AuthTabs 
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                firstName={firstName}
                setFirstName={setFirstName}
                lastName={lastName}
                setLastName={setLastName}
                isLoading={isLoading}
                authError={authError}
                handleSignIn={handleSignIn}
                handleSignUp={handleSignUp}
                handleGoogleSignIn={handleGoogleSignIn}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Login;
