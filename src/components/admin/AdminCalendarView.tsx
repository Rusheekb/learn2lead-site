import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Filter, X, CalendarDays, Clock, User, Users } from 'lucide-react';
import { fetchScheduledClasses } from '@/services/class/fetch';
import { supabase } from '@/integrations/supabase/client';
import { format, isSameDay } from 'date-fns';
import { ClassEvent } from '@/types/tutorTypes';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

interface ProfileOption {
  id: string;
  name: string;
}

const AdminCalendarView: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTutors, setSelectedTutors] = useState<string[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');

  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ['admin-all-classes'],
    queryFn: () => fetchScheduledClasses(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: tutorProfiles = [] } = useQuery<ProfileOption[]>({
    queryKey: ['admin-tutor-profiles'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('role', 'tutor');
      return (data || []).map(p => ({
        id: p.id,
        name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown',
      }));
    },
  });

  const { data: studentProfiles = [] } = useQuery<ProfileOption[]>({
    queryKey: ['admin-student-profiles'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('role', 'student');
      return (data || []).map(p => ({
        id: p.id,
        name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown',
      }));
    },
  });

  const subjects = useMemo(() => {
    const set = new Set(classes.map(c => c.subject).filter(Boolean));
    return Array.from(set).sort();
  }, [classes]);

  const filteredClasses = useMemo(() => {
    return classes.filter(cls => {
      if (selectedTutors.length > 0 && (!cls.tutorId || !selectedTutors.includes(cls.tutorId))) return false;
      if (selectedStudents.length > 0 && (!cls.studentId || !selectedStudents.includes(cls.studentId))) return false;
      if (selectedSubject !== 'all' && cls.subject !== selectedSubject) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const searchable = `${cls.title} ${cls.tutorName} ${cls.studentName} ${cls.subject}`.toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
  }, [classes, selectedTutors, selectedStudents, selectedSubject, searchQuery]);

  const classesForSelectedDate = useMemo(() => {
    return filteredClasses.filter(cls => isSameDay(cls.date, selectedDate));
  }, [filteredClasses, selectedDate]);

  const datesWithClasses = useMemo(() => {
    return filteredClasses
      .map(cls => cls.date)
      .filter((d): d is Date => d instanceof Date);
  }, [filteredClasses]);

  const hasActiveFilters = selectedTutors.length > 0 || selectedStudents.length > 0 || selectedSubject !== 'all' || searchQuery !== '';

  const clearAllFilters = () => {
    setSelectedTutors([]);
    setSelectedStudents([]);
    setSelectedSubject('all');
    setSearchQuery('');
  };

  const toggleSelection = (id: string, selected: string[], setSelected: React.Dispatch<React.SetStateAction<string[]>>) => {
    setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  if (classesLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search classes..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <MultiSelectFilter
              label="Tutors"
              icon={<User className="h-4 w-4" />}
              options={tutorProfiles}
              selected={selectedTutors}
              onToggle={id => toggleSelection(id, selectedTutors, setSelectedTutors)}
            />

            <MultiSelectFilter
              label="Students"
              icon={<Users className="h-4 w-4" />}
              options={studentProfiles}
              selected={selectedStudents}
              onToggle={id => toggleSelection(id, selectedStudents, setSelectedStudents)}
            />

            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                <X className="h-4 w-4 mr-1" /> Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Calendar + Day Detail */}
      <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
        <Card>
          <CardContent className="pt-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={d => d && setSelectedDate(d)}
              modifiers={{ hasClass: datesWithClasses }}
              modifiersClassNames={{
                hasClass: 'bg-primary/15 font-semibold text-primary',
              }}
            />
            <div className="mt-2 px-3 text-xs text-muted-foreground flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-primary/15" />
              Days with classes
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              <Badge variant="secondary" className="ml-auto">
                {classesForSelectedDate.length} class{classesForSelectedDate.length !== 1 ? 'es' : ''}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {classesForSelectedDate.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No classes scheduled for this date.
              </p>
            ) : (
              <ScrollArea className="max-h-[420px]">
                <div className="space-y-2">
                  {classesForSelectedDate
                    .sort((a, b) => a.startTime.localeCompare(b.startTime))
                    .map(cls => (
                      <ClassCard key={cls.id} cls={cls} />
                    ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      <p className="text-xs text-muted-foreground">
        Showing {filteredClasses.length} of {classes.length} total classes
        {hasActiveFilters && ' (filtered)'}
      </p>
    </div>
  );
};

const ClassCard: React.FC<{ cls: ClassEvent }> = ({ cls }) => (
  <div className="flex items-start gap-3 rounded-lg border p-3 text-sm">
    <div className="flex flex-col items-center text-muted-foreground">
      <Clock className="h-4 w-4 mb-0.5" />
      <span className="text-xs">{cls.startTime}</span>
      <span className="text-xs">{cls.endTime}</span>
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-medium truncate">{cls.title}</p>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
        <span>Tutor: {cls.tutorName}</span>
        <span>Student: {cls.studentName}</span>
      </div>
    </div>
    <div className="flex flex-col items-end gap-1">
      <Badge variant="outline" className="text-xs">{cls.subject}</Badge>
      <Badge
        variant={cls.status === 'completed' ? 'default' : cls.status === 'cancelled' ? 'destructive' : 'secondary'}
        className="text-xs"
      >
        {cls.status}
      </Badge>
    </div>
  </div>
);

interface MultiSelectFilterProps {
  label: string;
  icon: React.ReactNode;
  options: ProfileOption[];
  selected: string[];
  onToggle: (id: string) => void;
}

const MultiSelectFilter: React.FC<MultiSelectFilterProps> = ({ label, icon, options, selected, onToggle }) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="outline" size="sm" className="gap-1.5">
        {icon}
        {label}
        {selected.length > 0 && (
          <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
            {selected.length}
          </Badge>
        )}
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-56 p-2" align="start">
      <ScrollArea className="max-h-[240px]">
        {options.length === 0 ? (
          <p className="text-sm text-muted-foreground p-2">No {label.toLowerCase()} found</p>
        ) : (
          options.map(opt => (
            <label
              key={opt.id}
              className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
            >
              <Checkbox
                checked={selected.includes(opt.id)}
                onCheckedChange={() => onToggle(opt.id)}
              />
              <span className="truncate">{opt.name}</span>
            </label>
          ))
        )}
      </ScrollArea>
    </PopoverContent>
  </Popover>
);

export default AdminCalendarView;
