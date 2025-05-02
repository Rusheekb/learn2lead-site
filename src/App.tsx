
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import React, { Suspense } from 'react';
import Index from './pages/Index';
import NotFound from './pages/NotFound';
import Login from './pages/Login';
import Pricing from './pages/Pricing';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import PrivateRoute from './components/PrivateRoute';
import { useRoleSync } from './hooks/useRoleSync';

const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const TutorDashboard = React.lazy(() => import('./pages/TutorDashboard'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  useRoleSync();

  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <TooltipProvider>
          <BrowserRouter>
            <AuthProvider>
              <ThemeProvider>
                {/* All routes are rendered inside the ThemeProvider */}
                <Routes>
                  {/* Public routes - ThemeProvider will ensure they're always in light mode */}
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/pricing" element={<Pricing />} />
                  
                  {/* Private routes - can toggle between dark/light mode */}
                  <Route element={
                    <>
                      <Toaster />
                      <Sonner />
                      <PrivateRoute />
                    </>
                  }>
                    <Route element={<PrivateRoute allowedRoles={['student']} />}>
                      <Route
                        path="/dashboard"
                        element={
                          <Suspense fallback={<div>Loading...</div>}>
                            <Dashboard />
                          </Suspense>
                        }
                      />
                      <Route
                        path="/profile"
                        element={
                          <Suspense fallback={<div>Loading...</div>}>
                            <Dashboard />
                          </Suspense>
                        }
                      />
                    </Route>

                    <Route element={<PrivateRoute allowedRoles={['tutor']} />}>
                      <Route
                        path="/tutor-dashboard"
                        element={
                          <Suspense fallback={<div>Loading...</div>}>
                            <TutorDashboard />
                          </Suspense>
                        }
                      />
                      <Route
                        path="/tutor-profile"
                        element={
                          <Suspense fallback={<div>Loading...</div>}>
                            <TutorDashboard />
                          </Suspense>
                        }
                      />
                    </Route>

                    <Route element={<PrivateRoute allowedRoles={['admin']} />}>
                      <Route
                        path="/admin-dashboard"
                        element={
                          <Suspense fallback={<div>Loading...</div>}>
                            <AdminDashboard />
                          </Suspense>
                        }
                      />
                    </Route>
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </ThemeProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </HelmetProvider>
    </QueryClientProvider>
  );
};

export default App;
