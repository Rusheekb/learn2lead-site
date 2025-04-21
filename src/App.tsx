import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Pricing from "./pages/Pricing";
import TutorDashboard from "./pages/TutorDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import { AuthProvider } from "./contexts/AuthContext";
import PrivateRoute from "./components/PrivateRoute";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/pricing" element={<Pricing />} />
                
                <Route element={<PrivateRoute allowedRoles={['student']} />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/profile" element={<Dashboard />} />
                </Route>
                
                <Route element={<PrivateRoute allowedRoles={['tutor']} />}>
                  <Route path="/tutor-dashboard" element={<TutorDashboard />} />
                  <Route path="/tutor-profile" element={<TutorDashboard />} />
                </Route>
                
                <Route element={<PrivateRoute allowedRoles={['admin']} />}>
                  <Route path="/admin-dashboard" element={<AdminDashboard />} />
                </Route>
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </HelmetProvider>
    </QueryClientProvider>
  );
};

export default App;
