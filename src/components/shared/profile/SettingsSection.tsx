import React from 'react';

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({
  title,
  description,
  children,
}) => {
  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b bg-muted/30">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
};

export default SettingsSection;
