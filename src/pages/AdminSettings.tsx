import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const AdminSettings: React.FC = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Admin Settings</h2>
      
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>System Settings</CardTitle>
            <CardDescription>Configure basic system preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Settings panel coming soon...</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Manage user roles and permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">User management tools coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminSettings;