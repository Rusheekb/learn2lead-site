
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const AppearanceSettings: React.FC = () => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Appearance Settings</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col space-y-4">
          <p className="text-sm text-muted-foreground">
            Additional appearance settings will be available in future updates.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AppearanceSettings;
