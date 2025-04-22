import { Calendar, Clock, Users } from 'lucide-react';

// Mock data for charts
export const subjectClassData = [
  { name: 'Math', count: 24, color: '#4F46E5' },
  { name: 'Science', count: 18, color: '#10B981' },
  { name: 'English', count: 15, color: '#F59E0B' },
  { name: 'History', count: 12, color: '#EF4444' },
  { name: 'Languages', count: 9, color: '#3B82F6' },
];

export const weeklyClassesData = [
  { name: 'Week 1', classes: 12 },
  { name: 'Week 2', classes: 15 },
  { name: 'Week 3', classes: 18 },
  { name: 'Week 4', classes: 14 },
  { name: 'Week 5', classes: 20 },
  { name: 'Week 6', classes: 22 },
  { name: 'Week 7', classes: 25 },
  { name: 'Week 8', classes: 23 },
];

export const studentProgressData = [
  { name: 'Week 1', avgScore: 72 },
  { name: 'Week 2', avgScore: 74 },
  { name: 'Week 3', avgScore: 78 },
  { name: 'Week 4', avgScore: 76 },
  { name: 'Week 5', avgScore: 80 },
  { name: 'Week 6', avgScore: 83 },
  { name: 'Week 7', avgScore: 85 },
  { name: 'Week 8', avgScore: 88 },
];

// Analytics stat cards data
export const statsData = [
  {
    title: 'Total Classes',
    value: '158',
    change: '+12% from last month',
    iconName: 'Calendar',
    iconColor: 'text-tutoring-blue',
  },
  {
    title: 'Active Students',
    value: '42',
    change: '+5 from last month',
    iconName: 'Users',
    iconColor: 'text-green-600',
  },
  {
    title: 'Average Class Duration',
    value: '54 min',
    change: '+2 min from last month',
    iconName: 'Clock',
    iconColor: 'text-amber-500',
  },
  {
    title: 'Active Tutors',
    value: '12',
    change: 'Same as last month',
    iconName: 'Users',
    iconColor: 'text-purple-600',
  },
];
