
import React from "react";

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case 'completed':
      return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Completed</span>;
    case 'upcoming':
      return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">Upcoming</span>;
    case 'cancelled':
      return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Cancelled</span>;
    default:
      return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">{status}</span>;
  }
};

export const AttendanceBadge: React.FC<{ attendance: string }> = ({ attendance }) => {
  switch (attendance) {
    case 'attended':
      return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Attended</span>;
    case 'missed':
      return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Missed</span>;
    case 'pending':
      return <span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-800">Pending</span>;
    default:
      return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">{attendance}</span>;
  }
};
