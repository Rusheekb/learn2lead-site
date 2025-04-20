
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Calendar, Book, MessageSquare, User } from "lucide-react";

const StudentMenubar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentHash = location.hash;
  
  const menuItems = [
    { 
      label: "Dashboard", 
      hash: "", 
      icon: <LayoutDashboard className="w-4 h-4 mr-2" /> 
    },
    { 
      label: "My Schedule", 
      hash: "#schedule", 
      icon: <Calendar className="w-4 h-4 mr-2" /> 
    },
    { 
      label: "Resources", 
      hash: "#resources", 
      icon: <Book className="w-4 h-4 mr-2" /> 
    },
    { 
      label: "Messages", 
      hash: "#messages", 
      icon: <MessageSquare className="w-4 h-4 mr-2" /> 
    },
    { 
      label: "Profile", 
      hash: "#profile", 
      icon: <User className="w-4 h-4 mr-2" /> 
    }
  ];
  
  const handleNavigation = (hash: string) => {
    navigate(`/dashboard${hash}`);
  };
  
  return (
    <div className="flex flex-wrap gap-2">
      {menuItems.map((item) => (
        <Button
          key={item.label}
          variant={currentHash === item.hash ? "default" : "ghost"}
          className={`flex items-center ${
            currentHash === item.hash ? "bg-tutoring-blue text-white" : ""
          }`}
          onClick={() => handleNavigation(item.hash)}
        >
          {item.icon} {item.label}
        </Button>
      ))}
    </div>
  );
};

export default StudentMenubar;
