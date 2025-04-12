
import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface StatusBadgeProps {
  status: string;
  className?: string;
}

export interface AttendanceBadgeProps {
  attendance: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return "bg-green-100 text-green-800";
      case 'upcoming':
        return "bg-blue-100 text-blue-800";
      case 'cancelled':
        return "bg-red-100 text-red-800";
      case 'in-progress':
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Badge 
      variant="outline" 
      className={cn("font-medium border-0 px-2 py-1", 
                   getStatusColor(status), 
                   className)}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

export const AttendanceBadge: React.FC<AttendanceBadgeProps> = ({ attendance, className }) => {
  const getAttendanceColor = (attendance: string) => {
    switch (attendance.toLowerCase()) {
      case 'attended':
        return "bg-green-100 text-green-800";
      case 'missed':
        return "bg-red-100 text-red-800";
      case 'pending':
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Badge 
      variant="outline" 
      className={cn("font-medium border-0 px-2 py-1", 
                   getAttendanceColor(attendance), 
                   className)}
    >
      {attendance.charAt(0).toUpperCase() + attendance.slice(1)}
    </Badge>
  );
};

export const RecurringBadge: React.FC<{ className?: string }> = ({ className }) => (
  <Badge 
    variant="outline"
    className={cn("bg-tutoring-blue/10 text-tutoring-blue font-medium border-0 px-2 py-1", className)}
  >
    Recurring
  </Badge>
);

export const MessageBadge: React.FC<{ count: number; className?: string }> = ({ count, className }) => {
  if (count <= 0) return null;
  
  return (
    <Badge 
      variant="outline"
      className={cn("bg-red-100 text-red-800 font-medium border-0 px-2 py-1 flex items-center", className)}
    >
      {count} new
    </Badge>
  );
};

export const MessageCountBadge: React.FC<{ count: number; className?: string }> = ({ count, className }) => {
  if (count <= 0) return null;
  
  return (
    <span className={cn("ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-xs font-medium text-red-800", className)}>
      {count}
    </span>
  );
};

export const CircleMessageBadge: React.FC<{ count: number; className?: string }> = ({ count, className }) => {
  if (count <= 0) return null;
  
  return (
    <div className={cn("inline-flex items-center justify-center w-6 h-6 text-xs font-medium text-white bg-red-500 rounded-full", className)}>
      {count}
    </div>
  );
};
