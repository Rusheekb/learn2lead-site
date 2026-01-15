import { useLocation, Link } from 'react-router-dom';
import { useEffect } from 'react';
import { Home, BookOpen, HelpCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      '404 Error: User attempted to access non-existent route:',
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        {/* 404 Illustration */}
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-primary/20">404</h1>
        </div>

        {/* Message */}
        <h2 className="text-2xl font-semibold text-foreground mb-3">
          Page Not Found
        </h2>
        <p className="text-muted-foreground mb-8">
          Sorry, the page you're looking for doesn't exist or has been moved.
          Let's get you back on track!
        </p>

        {/* Primary Action */}
        <Button asChild size="lg" className="mb-8">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>

        {/* Quick Links */}
        <div className="border-t border-border pt-6">
          <p className="text-sm text-muted-foreground mb-4">
            Or try one of these pages:
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
            >
              <Home className="h-4 w-4" />
              Home
            </Link>
            <Link
              to="/pricing"
              className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
            >
              <BookOpen className="h-4 w-4" />
              Pricing
            </Link>
            <Link
              to="/login"
              className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
            >
              <HelpCircle className="h-4 w-4" />
              Login
            </Link>
          </div>
        </div>

        {/* Attempted Path (for debugging) */}
        <p className="mt-8 text-xs text-muted-foreground/60">
          Attempted path: <code className="bg-muted px-1 py-0.5 rounded">{location.pathname}</code>
        </p>
      </div>
    </div>
  );
};

export default NotFound;
