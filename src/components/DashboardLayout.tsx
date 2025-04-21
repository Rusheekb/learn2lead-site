
import React, { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Calendar, User, Users, FileText, DollarSign, BarChart, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  role: "student" | "tutor" | "admin";
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, title, role }) => {
  const location = useLocation();
  const [currentPath, setCurrentPath] = useState(location.pathname);
  const [currentHash, setCurrentHash] = useState(location.hash);
  const { signOut } = useAuth();

  // Update current path and hash when location changes
  useEffect(() => {
    setCurrentPath(location.pathname);
    setCurrentHash(location.hash);
  }, [location]);

  // Create navigation items based on role
  const navItems = React.useMemo(() => {
    switch (role) {
      case "student":
        return [
          { name: "Learning Portal", href: "/dashboard", icon: <FileText className="h-5 w-5" /> },
          { name: "Class Schedule", href: "/dashboard#schedule", icon: <Calendar className="h-5 w-5" /> },
          { name: "Resources", href: "/dashboard#resources", icon: <FileText className="h-5 w-5" /> },
          { name: "Messages", href: "/dashboard#messages", icon: <User className="h-5 w-5" /> },
          { name: "Profile", href: "/profile", icon: <User className="h-5 w-5" /> },
        ];
      case "tutor":
        return [
          { name: "Overview", href: "/tutor-dashboard", icon: <BarChart className="h-5 w-5" /> },
          { name: "My Schedule", href: "/tutor-dashboard#schedule", icon: <Calendar className="h-5 w-5" /> },
          { name: "My Students", href: "/tutor-dashboard#students", icon: <Users className="h-5 w-5" /> },
          { name: "Class Materials", href: "/tutor-dashboard#materials", icon: <FileText className="h-5 w-5" /> },
          { name: "Profile", href: "/tutor-profile", icon: <User className="h-5 w-5" /> },
        ];
      case "admin":
        return [
          { name: "Dashboard", href: "/admin-dashboard", icon: <BarChart className="h-5 w-5" /> },
          { name: "Class Schedule", href: "/admin-dashboard#schedule", icon: <Calendar className="h-5 w-5" /> },
          { name: "Tutors", href: "/admin-dashboard#tutors", icon: <User className="h-5 w-5" /> },
          { name: "Students", href: "/admin-dashboard#students", icon: <Users className="h-5 w-5" /> },
          { name: "Payments", href: "/admin-dashboard#payments", icon: <DollarSign className="h-5 w-5" /> },
        ];
      default:
        return [];
    }
  }, [role]);

  // Check if a nav item is active based on both path and hash
  const isNavItemActive = (item: { href: string }) => {
    const [path, hash] = item.href.split('#');
    return currentPath === path && (hash ? currentHash === `#${hash}` : !currentHash);
  };

  const handleLogout = () => {
    signOut();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Link to={role === 'student' ? '/dashboard' : role === 'tutor' ? '/tutor-dashboard' : '/admin-dashboard'} className="text-2xl font-bold text-tutoring-blue">
                Learn<span className="text-tutoring-teal">2</span>Lead
              </Link>
              <span className="ml-2 text-gray-500">{title}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric'
                })}
              </span>
              <Button 
                variant="ghost" 
                className="flex items-center gap-1 text-gray-600 hover:text-gray-900" 
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          <aside className="md:w-64 flex-shrink-0">
            <nav className="space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center px-4 py-3 text-sm font-medium rounded-md",
                    "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                    isNavItemActive(item) ? "bg-tutoring-blue/10 text-tutoring-blue" : ""
                  )}
                >
                  {item.icon}
                  <span className="ml-3">{item.name}</span>
                </Link>
              ))}
            </nav>
          </aside>

          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
