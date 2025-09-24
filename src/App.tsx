
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import React from 'react';
import OptimizedSuspense from './components/shared/OptimizedSuspense';
// Lazy load all pages for optimal code splitting
const Index = React.lazy(() => import('./pages/Index'));
const NotFound = React.lazy(() => import('./pages/NotFound'));
const Login = React.lazy(() => import('./pages/Login'));
const Pricing = React.lazy(() => import('./pages/Pricing'));
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import { useRoleSync } from './hooks/useRoleSync';
import { RoutePersistence } from './components/shared/RoutePersistence';
import { SidebarProvider } from '@/hooks/useSidebar';
import DashboardShell from './components/shared/DashboardShell';
import './i18n';
import { LanguageProvider } from './contexts/LanguageContext';
import PerformanceMonitor from './components/shared/PerformanceMonitor';
const Profile = React.lazy(() => import('./pages/Profile'));
const TutorDashboard = React.lazy(() => import('./pages/TutorDashboard'));

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
    <OptimizedSuspense>
      {children}
    </OptimizedSuspense>
  </DashboardShell>
);

const TutorDashboardWrapper = ({ children }: { children: React.ReactNode }) => (
  <DashboardShell title="Tutor Portal">
    <OptimizedSuspense>
      {children}
    </OptimizedSuspense>
  </DashboardShell>
);

const AdminDashboardWrapper = ({ children }: { children: React.ReactNode }) => (
  <DashboardShell title="Admin Portal">
    <OptimizedSuspense>
      {children}
    </OptimizedSuspense>
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
                <RoutePersistence />
                <SidebarProvider>
                  <Routes>
                    {/* Public routes with optimized loading */}
                    <Route path="/" element={
                      <OptimizedSuspense>
                        <Index />
                      </OptimizedSuspense>
                    } />
                    <Route path="/login" element={
                      <OptimizedSuspense>
                        <Login />
                      </OptimizedSuspense>
                    } />
                    <Route path="/pricing" element={
                      <OptimizedSuspense>
                        <Pricing />
                      </OptimizedSuspense>
                    } />
                    
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

                    <Route path="*" element={
                      <OptimizedSuspense>
                        <NotFound />
                      </OptimizedSuspense>
                    } />
                  </Routes>
                </SidebarProvider>
              </AuthProvider>
            </BrowserRouter>
            <PerformanceMonitor />
          </TooltipProvider>
        </HelmetProvider>
      </QueryClientProvider>
    </LanguageProvider>
  );
}

export default App;
