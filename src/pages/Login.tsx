
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import NavBar from '@/components/NavBar';
import { toast } from 'sonner';
import AuthTabs from '@/components/auth/AuthTabs';
import { getSavedRoute } from '@/hooks/useRoutePersistence';

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
      setAuthError(errorDescription || 'An error occurred during authentication');
      toast.error(errorDescription || 'Authentication error');
      
      // Clear error params from URL
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (user && userRole) {
      // Try to get saved route first, then fall back to default dashboard
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

    if (!email || !password) {
      toast.error('Please enter your email and password.');
      return;
    }

    setIsLoading(true);

    try {
      await signIn(email, password);
      // Navigation is handled by AuthContext
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof Error) {
        setAuthError(error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!email || !password) {
      toast.error('Please enter your email and password.');
      return;
    }

    if (!firstName.trim() || !lastName.trim()) {
      toast.error('Please enter your first and last name.');
      return;
    }

    if (firstName.trim().length < 2 || lastName.trim().length < 2) {
      toast.error('First and last name must be at least 2 characters.');
      return;
    }
    
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      await signUp(email, password, { first_name: firstName.trim(), last_name: lastName.trim() });
      toast.success(
        'Account created! Please check your email for verification.'
      );
    } catch (error) {
      console.error('Registration error:', error);
      if (error instanceof Error) {
        setAuthError(error.message);
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
      // Redirect happens automatically
    } catch (error) {
      console.error('Google sign in error:', error);
      if (error instanceof Error) {
        setAuthError(error.message);
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
