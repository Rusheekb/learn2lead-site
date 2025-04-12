
import React from "react";
import { 
  StatusBadge as SharedStatusBadge, 
  AttendanceBadge as SharedAttendanceBadge 
} from "@/components/shared/ClassBadges";

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  return <SharedStatusBadge status={status} />;
};

export const AttendanceBadge: React.FC<{ attendance: string }> = ({ attendance }) => {
  return <SharedAttendanceBadge attendance={attendance} />;
};
