
import React, { ReactNode, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, User, Users, FileText, DollarSign, BarChart, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  role: "student" | "tutor" | "admin";
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, title, role }) => {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [currentHash, setCurrentHash] = useState(window.location.hash);

  // Update current path and hash when they change
  useEffect(() => {
    const handleRouteChange = () => {
      setCurrentPath(window.location.pathname);
      setCurrentHash(window.location.hash);
    };

    // Set initial values
    handleRouteChange();
    
    // Listen for hash changes
    window.addEventListener('hashchange', handleRouteChange);
    
    return () => {
      window.removeEventListener('hashchange', handleRouteChange);
    };
  }, []);

  const getNavItems = () => {
    switch (role) {
      case "student":
        return [
          { name: "Learning Portal", href: "/dashboard", icon: <FileText className="h-5 w-5" /> },
          { name: "Class Schedule", href: "#classes", icon: <Calendar className="h-5 w-5" /> },
        ];
      case "tutor":
        return [
          { name: "Overview", href: "/tutor-dashboard", icon: <BarChart className="h-5 w-5" /> },
          { name: "My Schedule", href: "/tutor-dashboard#schedule", icon: <Calendar className="h-5 w-5" /> },
          { name: "My Students", href: "/tutor-dashboard#students", icon: <Users className="h-5 w-5" /> },
          { name: "Class Materials", href: "/tutor-dashboard#materials", icon: <FileText className="h-5 w-5" /> },
        ];
      case "admin":
        return [
          { name: "Dashboard", href: "/admin-dashboard#analytics", icon: <BarChart className="h-5 w-5" /> },
          { name: "Class Schedule", href: "/admin-dashboard#schedule", icon: <Calendar className="h-5 w-5" /> },
          { name: "Tutors", href: "/admin-dashboard#tutors", icon: <User className="h-5 w-5" /> },
          { name: "Students", href: "/admin-dashboard#students", icon: <Users className="h-5 w-5" /> },
          { name: "Payments", href: "/admin-dashboard#payments", icon: <DollarSign className="h-5 w-5" /> },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  // For debugging
  useEffect(() => {
    console.log("Current hash:", currentHash);
    console.log("Current path:", currentPath);
  }, [currentHash, currentPath]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Link to="/" className="text-2xl font-bold text-tutoring-blue">
                Learn<span className="text-tutoring-teal">2</span>Lead
              </Link>
              <span className="ml-2 text-gray-500">{title}</span>
            </div>
            <div className="flex items-center gap-4">
              <Calendar className="h-5 w-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric'
                })}
              </span>
              <Link to="/login" className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900">
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          <aside className="md:w-64 flex-shrink-0">
            <nav className="space-y-1">
              {navItems.map((item) => {
                // Improved logic for determining active state
                const isActive = 
                  currentPath === item.href.split('#')[0] && 
                  (item.href.includes('#') ? 
                    currentHash === '#' + item.href.split('#')[1] || 
                    (currentHash === '' && item.href.includes('#analytics')) : 
                    true);
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "flex items-center px-4 py-3 text-sm font-medium rounded-md",
                      "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                      isActive ? "bg-tutoring-blue/10 text-tutoring-blue" : ""
                    )}
                    onClick={() => {
                      // Force update path and hash immediately on click
                      setCurrentPath(item.href.split('#')[0]);
                      setCurrentHash(item.href.includes('#') ? '#' + item.href.split('#')[1] : '');
                    }}
                  >
                    {item.icon}
                    <span className="ml-3">{item.name}</span>
                  </Link>
                );
              })}
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
