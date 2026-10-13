import React from 'react';
import { Globe } from 'lucide-react';
import { format } from 'date-fns';
import { useStudentTimezone } from '@/hooks/useStudentTimezone';
import {
  BUSINESS_TIMEZONE,
  classInstantsFromInput,
  formatTime12,
  formatTimeWithZone,
  getViewerTimezone,
  instantToZonedParts,
  timezoneLabel,
  zoneAbbreviation,
  zonesDiffer,
} from '@/lib/time';

interface ClassTimezoneHintProps {
  studentId?: string | null;
  studentName?: string | null;
  date?: Date | string | null;
  startTime?: string;
  endTime?: string;
}

const isHHmm = (t?: string) => !!t && /^\d{1,2}:\d{2}/.test(t);

/**
 * Under a class's time fields: says which zone the times are entered in (the
 * tutor's own) and, when the student is somewhere else, what time that is
 * for them — so nobody has to convert in their head.
 */
const ClassTimezoneHint: React.FC<ClassTimezoneHintProps> = ({
  studentId,
  studentName,
  date,
  startTime,
  endTime,
}) => {
  const viewerTz = getViewerTimezone();
  const { data: savedStudentTz } = useStudentTimezone(studentId);
  const studentTz = savedStudentTz || BUSINESS_TIMEZONE;

  const day =
    date instanceof Date
      ? format(date, 'yyyy-MM-dd')
      : typeof date === 'string' && date
        ? date.slice(0, 10)
        : format(new Date(), 'yyyy-MM-dd');

  let studentLine: string | null = null;
  if (studentId && isHHmm(startTime) && isHHmm(endTime)) {
    const { start_at, end_at } = classInstantsFromInput(
      day,
      startTime!,
      endTime!,
      viewerTz
    );
    if (zonesDiffer(start_at, viewerTz, studentTz)) {
      const sameDay =
        instantToZonedParts(start_at, studentTz).date ===
        instantToZonedParts(start_at, viewerTz).date;
      const dayNote = sameDay
        ? ''
        : ` (${format(new Date(instantToZonedParts(start_at, studentTz).date + 'T12:00:00'), 'EEE, MMM d')})`;
      studentLine = `${studentName || 'Student'} sees: ${formatTime12(start_at, studentTz)} – ${formatTimeWithZone(end_at, studentTz)}${dayNote}`;
    }
  }

  const sampleInstant = classInstantsFromInput(
    day,
    isHHmm(startTime) ? startTime! : '12:00',
    '23:59',
    viewerTz
  ).start_at;

  return (
    <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
      <Globe className="h-3.5 w-3.5 mt-0.5 shrink-0" />
      <div>
        <p>
          Times are in your time zone: {timezoneLabel(viewerTz)} (
          {zoneAbbreviation(sampleInstant, viewerTz)}).
        </p>
        {studentLine && (
          <p className="font-medium text-foreground">{studentLine}</p>
        )}
      </div>
    </div>
  );
};

export default ClassTimezoneHint;
