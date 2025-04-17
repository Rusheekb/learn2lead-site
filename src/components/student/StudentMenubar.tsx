
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Menubar,
  MenubarContent,
  MenubarItem, 
  MenubarMenu, 
  MenubarTrigger 
} from "@/components/ui/menubar";
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
    <Menubar className="border-none bg-transparent space-x-2">
      {menuItems.map((item) => (
        <MenubarMenu key={item.label}>
          <MenubarTrigger 
            className={`flex items-center px-4 py-2 rounded-md cursor-pointer ${
              currentHash === item.hash ? "bg-tutoring-blue/10 text-tutoring-blue" : ""
            }`}
            onClick={() => handleNavigation(item.hash)}
          >
            {item.icon} {item.label}
          </MenubarTrigger>
          <MenubarContent>
            <MenubarItem
              onClick={() => handleNavigation(item.hash)}
              className="cursor-pointer"
            >
              Go to {item.label}
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      ))}
    </Menubar>
  );
};

export default StudentMenubar;
