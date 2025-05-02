
import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface ToggleSwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  id: string;
  className?: string;
  description?: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onCheckedChange,
  label,
  id,
  className,
  description,
}) => {
  const descriptionId = description ? `${id}-description` : undefined;
  
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Switch 
        id={id} 
        checked={checked} 
        onCheckedChange={onCheckedChange} 
        className="focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-tutoring-blue dark:focus-visible:ring-tutoring-teal"
        aria-describedby={descriptionId}
      />
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      {description && (
        <span id={descriptionId} className="sr-only">
          {description}
        </span>
      )}
    </div>
  );
};

export default ToggleSwitch;
