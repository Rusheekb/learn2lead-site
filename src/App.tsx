
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import OptimizedSuspense from './components/shared/OptimizedSuspense';

// Lazy load all pages for optimal code splitting
const Index = React.lazy(() => import('./pages/Index'));
const NotFound = React.lazy(() => import('./pages/NotFound'));
const Login = React.lazy(() => import('./pages/Login'));
const Pricing = React.lazy(() => import('./pages/Pricing'));
import { AuthProvider } from './contexts/AuthContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import PrivateRoute from './components/PrivateRoute';
import { useRoleSync } from './hooks/useRoleSync';
import { RoutePersistence } from './components/shared/RoutePersistence';
import { SidebarProvider } from '@/hooks/useSidebar';
import DashboardShell from './components/shared/DashboardShell';
import ErrorBoundary from './components/ErrorBoundary';

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

// Animated page wrapper
const AnimatedPage = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
  >
    {children}
  </motion.div>
);

// Wrapper for dashboard routes that adds the DashboardShell
const StudentDashboardWrapper = ({ children }: { children: React.ReactNode }) => (
  <DashboardShell title="Student Portal">
    <OptimizedSuspense>
      <AnimatedPage>{children}</AnimatedPage>
    </OptimizedSuspense>
  </DashboardShell>
);

const TutorDashboardWrapper = ({ children }: { children: React.ReactNode }) => (
  <DashboardShell title="Tutor Portal">
    <OptimizedSuspense>
      <AnimatedPage>{children}</AnimatedPage>
    </OptimizedSuspense>
  </DashboardShell>
);

const AdminDashboardWrapper = ({ children }: { children: React.ReactNode }) => (
  <DashboardShell title="Admin Portal">
    <OptimizedSuspense>
      <AnimatedPage>{children}</AnimatedPage>
    </OptimizedSuspense>
  </DashboardShell>
);

// Animated routes component
const AnimatedRoutes = () => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public routes with optimized loading */}
        <Route path="/" element={
          <OptimizedSuspense>
            <AnimatedPage><Index /></AnimatedPage>
          </OptimizedSuspense>
        } />
        <Route path="/login" element={
          <OptimizedSuspense>
            <AnimatedPage><Login /></AnimatedPage>
          </OptimizedSuspense>
        } />
        <Route path="/pricing" element={
          <OptimizedSuspense>
            <AnimatedPage><Pricing /></AnimatedPage>
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
            <AnimatedPage><NotFound /></AnimatedPage>
          </OptimizedSuspense>
        } />
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  useRoleSync();

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <BrowserRouter>
            <AuthProvider>
              <SubscriptionProvider>
                <RoutePersistence />
                <SidebarProvider>
                  <AnimatedRoutes />
                </SidebarProvider>
              </SubscriptionProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
