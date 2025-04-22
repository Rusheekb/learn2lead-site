import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, Users } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string;
  change: string;
  iconName: string;
  iconColor: string;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  change,
  iconName,
  iconColor,
}) => {
  // Render the appropriate icon based on the iconName
  const renderIcon = () => {
    switch (iconName) {
      case 'Calendar':
        return <Calendar className={`h-8 w-8 ${iconColor}`} />;
      case 'Users':
        return <Users className={`h-8 w-8 ${iconColor}`} />;
      case 'Clock':
        return <Clock className={`h-8 w-8 ${iconColor}`} />;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardContent className="flex p-6 items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          <p className="text-xs text-gray-500 mt-1">{change}</p>
        </div>
        <div className="bg-gray-100 p-3 rounded-full">{renderIcon()}</div>
      </CardContent>
    </Card>
  );
};

export default StatsCard;
