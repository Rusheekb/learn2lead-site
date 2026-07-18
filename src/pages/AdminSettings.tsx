import React, { useEffect, useState } from 'react';
import { Users, UserRound, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import SettingsSection from '@/components/shared/profile/SettingsSection';
import PasswordChangeCard from '@/components/shared/profile/PasswordChangeCard';
import AppearanceToggle from '@/components/shared/profile/AppearanceToggle';
import { logger } from '@/lib/logger';
import { startOfMonth, format } from 'date-fns';

const log = logger.create('AdminSettings');

interface PlatformStats {
  tutorCount: number;
  studentCount: number;
  classesThisMonth: number;
}

const AdminSettings: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<PlatformStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
        const [tutorsRes, studentsRes, classesRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('role', 'tutor'),
          supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('role', 'student'),
          supabase
            .from('class_logs')
            .select('id', { count: 'exact', head: true })
            .gte('Date', monthStart),
        ]);
        setStats({
          tutorCount: tutorsRes.count ?? 0,
          studentCount: studentsRes.count ?? 0,
          classesThisMonth: classesRes.count ?? 0,
        });
      } catch (error) {
        log.error('Failed to fetch platform stats', error);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Platform Summary */}
      <SettingsSection
        title="Platform Summary"
        description="A live snapshot of the platform."
      >
        <div className="grid grid-cols-3 divide-x divide-border">
          <StatCell
            icon={<UserRound className="h-4 w-4 text-blue-500" />}
            label="Tutors"
            value={stats?.tutorCount}
          />
          <StatCell
            icon={<Users className="h-4 w-4 text-emerald-500" />}
            label="Students"
            value={stats?.studentCount}
          />
          <StatCell
            icon={<BookOpen className="h-4 w-4 text-violet-500" />}
            label="Classes this month"
            value={stats?.classesThisMonth}
          />
        </div>
      </SettingsSection>

      {/* Account Security */}
      <SettingsSection
        title="Account Security"
        description="Manage your admin login credentials."
      >
        <PasswordChangeCard
          email={user?.email ?? ''}
          emailNote="Email is managed via your Supabase auth account."
        />
      </SettingsSection>

      {/* Appearance */}
      <SettingsSection
        title="Appearance"
        description="Customize the look and feel of your dashboard."
      >
        <AppearanceToggle />
      </SettingsSection>
    </div>
  );
};

interface StatCellProps {
  icon: React.ReactNode;
  label: string;
  value: number | undefined;
}

const StatCell: React.FC<StatCellProps> = ({ icon, label, value }) => (
  <div className="flex flex-col items-center justify-center gap-1 py-6 px-4 text-center">
    <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </div>
    <p className="text-3xl font-bold tabular-nums">
      {value === undefined ? '—' : value.toLocaleString()}
    </p>
  </div>
);

export default AdminSettings;
