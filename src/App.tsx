
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
import PrivateRoute from './components/PrivateRoute';
import { useRoleSync } from './hooks/useRoleSync';
import { SidebarProvider } from '@/hooks/useSidebar';
import DashboardShell from './components/shared/DashboardShell';
import './i18n';
import { LanguageProvider } from './contexts/LanguageContext';
import Profile from './pages/Profile';
import TutorDashboard from './pages/TutorDashboard';

// Still lazy-loading these components
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
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
const StudentDashboardWrapper = ({ children }: { children: React.ReactNode }) => (
  <DashboardShell title="Student Portal">
    <Suspense fallback={<div>Loading...</div>}>
      {children}
    </Suspense>
  </DashboardShell>
);

const TutorDashboardWrapper = ({ children }: { children: React.ReactNode }) => (
  <DashboardShell title="Tutor Portal">
    {children}
  </DashboardShell>
);

const AdminDashboardWrapper = ({ children }: { children: React.ReactNode }) => (
  <DashboardShell title="Admin Portal">
    <Suspense fallback={<div>Loading...</div>}>
      {children}
    </Suspense>
  </DashboardShell>
);

function App() {
  useRoleSync();

  return (
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <HelmetProvider>
          <TooltipProvider>
            <BrowserRouter>
              <AuthProvider>
                <SidebarProvider>
                  <Routes>
                    {/* Public routes */}
                    <Route path="/" element={<Index />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/pricing" element={<Pricing />} />
                    
                    {/* Private routes */}
                    <Route element={
                      <>
                        <Toaster />
                        <Sonner />
                        <PrivateRoute />
                      </>
                    }>
                      <Route element={<PrivateRoute allowedRoles={['student']} />}>
                        <Route path="/dashboard/*" element={
                          <StudentDashboardWrapper>
                            <Dashboard />
                          </StudentDashboardWrapper>
                        } />
                        <Route path="/profile" element={
                          <StudentDashboardWrapper>
                            <Profile />
                          </StudentDashboardWrapper>
                        } />
                      </Route>

                      <Route element={<PrivateRoute allowedRoles={['tutor']} />}>
                        <Route path="/tutor-dashboard/*" element={
                          <TutorDashboardWrapper>
                            <TutorDashboard />
                          </TutorDashboardWrapper>
                        } />
                        <Route path="/tutor-profile" element={
                          <TutorDashboardWrapper>
                            <Profile />
                          </TutorDashboardWrapper>
                        } />
                      </Route>

                      <Route element={<PrivateRoute allowedRoles={['admin']} />}>
                        <Route path="/admin-dashboard/*" element={
                          <AdminDashboardWrapper>
                            <AdminDashboard />
                          </AdminDashboardWrapper>
                        } />
                        <Route path="/admin-profile" element={
                          <AdminDashboardWrapper>
                            <Profile />
                          </AdminDashboardWrapper>
                        } />
                      </Route>
                    </Route>

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </SidebarProvider>
              </AuthProvider>
            </BrowserRouter>
          </TooltipProvider>
        </HelmetProvider>
      </QueryClientProvider>
    </LanguageProvider>
  );
}

export default App;
