
import React from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface ToggleSwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  id: string;
  className?: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onCheckedChange,
  label,
  id,
  className,
}) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Switch 
        id={id}
        checked={checked} 
        onCheckedChange={onCheckedChange} 
      />
      <Label htmlFor={id}>{label}</Label>
    </div>
  );
};

export default ToggleSwitch;
