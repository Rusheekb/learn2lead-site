import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Profile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { CalendarDays, Clock, BookOpen, Users, TrendingUp, Award } from 'lucide-react';

interface AnalyticsTabProps {
  profile: Profile;
}

interface AnalyticsData {
  totalClasses: number;
  totalHours: number;
  completedClasses: number;
  upcomingClasses: number;
  favoriteSubject: string;
  monthlyHours: number;
  attendanceRate: number;
}

const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ profile }) => {
  const { t } = useTranslation();
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalClasses: 0,
    totalHours: 0,
    completedClasses: 0,
    upcomingClasses: 0,
    favoriteSubject: 'N/A',
    monthlyHours: 0,
    attendanceRate: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      try {
        let query = supabase.from('scheduled_classes').select('*');
        
        if (profile.role === 'student') {
          query = query.eq('student_id', profile.id);
        } else if (profile.role === 'tutor') {
          query = query.eq('tutor_id', profile.id);
        }

        const { data: classes, error } = await query;

        if (error) {
          console.error('Error fetching analytics:', error);
          return;
        }

        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const completedClasses = classes?.filter(c => c.status === 'completed') || [];
        const upcomingClasses = classes?.filter(c => new Date(c.date) > now) || [];
        const thisMonthClasses = classes?.filter(c => new Date(c.date) >= thisMonth) || [];

        // Calculate total hours
        const totalHours = completedClasses.reduce((acc, cls) => {
          const start = new Date(`1970-01-01T${cls.start_time}`);
          const end = new Date(`1970-01-01T${cls.end_time}`);
          return acc + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        }, 0);

        const monthlyHours = thisMonthClasses.reduce((acc, cls) => {
          const start = new Date(`1970-01-01T${cls.start_time}`);
          const end = new Date(`1970-01-01T${cls.end_time}`);
          return acc + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        }, 0);

        // Find favorite subject
        const subjectCounts: Record<string, number> = {};
        completedClasses.forEach(cls => {
          if (cls.subject) {
            subjectCounts[cls.subject] = (subjectCounts[cls.subject] || 0) + 1;
          }
        });
        const favoriteSubject = Object.keys(subjectCounts).length > 0 
          ? Object.entries(subjectCounts).sort(([,a], [,b]) => b - a)[0][0]
          : 'N/A';

        // Calculate attendance rate
        const attendedClasses = completedClasses.filter(c => c.attendance === 'present').length;
        const attendanceRate = completedClasses.length > 0 
          ? (attendedClasses / completedClasses.length) * 100 
          : 0;

        setAnalytics({
          totalClasses: classes?.length || 0,
          totalHours: Math.round(totalHours * 10) / 10,
          completedClasses: completedClasses.length,
          upcomingClasses: upcomingClasses.length,
          favoriteSubject,
          monthlyHours: Math.round(monthlyHours * 10) / 10,
          attendanceRate: Math.round(attendanceRate)
        });
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [profile]);

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    subtitle 
  }: { 
    title: string; 
    value: string | number; 
    icon: React.ElementType; 
    subtitle?: string;
  }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center space-x-2">
          <Icon className="h-8 w-8 text-primary" />
          <div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-sm text-muted-foreground">{title}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-8 bg-muted rounded mb-2"></div>
                  <div className="h-4 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('profile.analyticsOverview')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard
              title={t('profile.totalClasses')}
              value={analytics.totalClasses}
              icon={BookOpen}
            />
            <StatCard
              title={t('profile.completedClasses')}
              value={analytics.completedClasses}
              icon={Award}
            />
            <StatCard
              title={t('profile.upcomingClasses')}
              value={analytics.upcomingClasses}
              icon={CalendarDays}
            />
            <StatCard
              title={t('profile.totalHours')}
              value={`${analytics.totalHours}h`}
              icon={Clock}
            />
            <StatCard
              title={t('profile.thisMonthHours')}
              value={`${analytics.monthlyHours}h`}
              icon={TrendingUp}
            />
            <StatCard
              title={t('profile.attendanceRate')}
              value={`${analytics.attendanceRate}%`}
              icon={Users}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('profile.insights')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
              <span className="font-medium">{t('profile.favoriteSubject')}</span>
              <span className="text-primary font-semibold">{analytics.favoriteSubject}</span>
            </div>
            
            {profile.role === 'student' && (
              <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                <span className="font-medium">{t('profile.learningStreak')}</span>
                <span className="text-primary font-semibold">
                  {analytics.completedClasses > 0 ? `${Math.floor(analytics.completedClasses / 4)} weeks` : '0 weeks'}
                </span>
              </div>
            )}

            {profile.role === 'tutor' && (
              <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                <span className="font-medium">{t('profile.teachingHours')}</span>
                <span className="text-primary font-semibold">{analytics.totalHours}h total</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsTab;