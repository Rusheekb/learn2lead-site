
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import React, { Suspense } from 'react';
import Index from './pages/Index';
import NotFound from './pages/NotFound';
import Login from './pages/Login';
import Pricing from './pages/Pricing';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import PrivateRoute from './components/PrivateRoute';
import { useRoleSync } from './hooks/useRoleSync';
import { SidebarProvider } from '@/hooks/useSidebar';
import DashboardShell from './components/shared/DashboardShell';
import './i18n';
import { LanguageProvider } from './contexts/LanguageContext';

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

// Wrapper for dashboard routes that adds the DashboardShell
const StudentDashboardWrapper = () => (
  <DashboardShell title="Student Portal">
    <Suspense fallback={<div>Loading...</div>}>
      <Dashboard />
    </Suspense>
  </DashboardShell>
);

const TutorDashboardWrapper = () => (
  <DashboardShell title="Tutor Portal">
    <Suspense fallback={<div>Loading...</div>}>
      <TutorDashboard />
    </Suspense>
  </DashboardShell>
);

const AdminDashboardWrapper = () => (
  <DashboardShell title="Admin Portal">
    <Suspense fallback={<div>Loading...</div>}>
      <AdminDashboard />
    </Suspense>
  </DashboardShell>
);

function App() {
  useRoleSync();

  return (
    // Fix: remove defaultTheme and enableSystem from the outer ThemeProvider
    <ThemeProvider>
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <HelmetProvider>
            <TooltipProvider>
              <BrowserRouter>
                <AuthProvider>
                  <ThemeProvider>
                    <SidebarProvider>
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
                            <Route path="/dashboard/*" element={<StudentDashboardWrapper />} />
                            <Route path="/profile/*" element={<StudentDashboardWrapper />} />
                          </Route>

                          <Route element={<PrivateRoute allowedRoles={['tutor']} />}>
                            <Route path="/tutor-dashboard/*" element={<TutorDashboardWrapper />} />
                            <Route path="/tutor-profile/*" element={<TutorDashboardWrapper />} />
                          </Route>

                          <Route element={<PrivateRoute allowedRoles={['admin']} />}>
                            <Route path="/admin-dashboard/*" element={<AdminDashboardWrapper />} />
                          </Route>
                        </Route>

                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </SidebarProvider>
                  </ThemeProvider>
                </AuthProvider>
              </BrowserRouter>
            </TooltipProvider>
          </HelmetProvider>
        </QueryClientProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
