import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { 
  getTopMatches, 
  MatchResult, 
  StudentPreferences, 
  TutorPreferences 
} from '@/utils/matchingAlgorithm';
import { Check, AlertTriangle, Info, Loader2 } from 'lucide-react';

interface SuggestedMatchesProps {
  selectedStudentId: string;
  studentEmail: string;
  tutors: Array<{ id: string; profileId: string; name: string }>;
  onSelectTutor: (tutorId: string) => void;
}

const SuggestedMatches: React.FC<SuggestedMatchesProps> = ({
  selectedStudentId,
  studentEmail,
  tutors,
  onSelectTutor,
}) => {
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [studentPrefsComplete, setStudentPrefsComplete] = useState(false);

  useEffect(() => {
    if (selectedStudentId && studentEmail) {
      loadMatches();
    } else {
      setMatches([]);
    }
  }, [selectedStudentId, studentEmail]);

  const loadMatches = async () => {
    setLoading(true);
    try {
      // Fetch student preferences
      const { data: studentData } = await supabase
        .from('students')
        .select('learning_pace, teaching_style_pref, session_structure_pref, primary_goal, availability_windows, communication_pref, grade')
        .eq('email', studentEmail)
        .single();

      if (!studentData) {
        setMatches([]);
        setStudentPrefsComplete(false);
        setLoading(false);
        return;
      }

      const studentPrefs: StudentPreferences = {
        learning_pace: studentData.learning_pace as StudentPreferences['learning_pace'],
        teaching_style_pref: studentData.teaching_style_pref as StudentPreferences['teaching_style_pref'],
        session_structure_pref: studentData.session_structure_pref as StudentPreferences['session_structure_pref'],
        primary_goal: studentData.primary_goal as StudentPreferences['primary_goal'],
        availability_windows: studentData.availability_windows || [],
        communication_pref: studentData.communication_pref as StudentPreferences['communication_pref'],
        grade: studentData.grade,
      };

      // Check if student has filled preferences
      const filledPrefs = [
        studentPrefs.learning_pace,
        studentPrefs.teaching_style_pref,
        studentPrefs.session_structure_pref,
        studentPrefs.primary_goal,
        studentPrefs.communication_pref,
      ].filter(Boolean).length;
      setStudentPrefsComplete(filledPrefs >= 3);

      // Fetch all tutors with their preferences
      const { data: tutorsData } = await supabase
        .from('tutors')
        .select('email, teaching_style_strength, preferred_pace, pace_flexibility, session_structure, specialty_focus, availability_windows, grade_level_comfort');

      if (!tutorsData) {
        setMatches([]);
        setLoading(false);
        return;
      }

      // Map tutors with their preferences
      const tutorsWithPrefs = tutors.map(tutor => {
        const tutorData = tutorsData.find(t => {
          // Match by checking if tutor name contains email username or vice versa
          return tutors.some(tt => tt.id === tutor.id);
        });
        
        // Try to find by iterating
        const matchedTutorData = tutorsData.find(td => {
          const tutorRecord = tutors.find(t => t.id === tutor.id);
          if (!tutorRecord) return false;
          // Match by name comparison (simplified)
          return td.email && tutorRecord.name.toLowerCase().includes(td.email.split('@')[0].toLowerCase());
        }) || tutorsData.find(td => td.email);

        const prefs: TutorPreferences = matchedTutorData ? {
          teaching_style_strength: matchedTutorData.teaching_style_strength as TutorPreferences['teaching_style_strength'],
          preferred_pace: matchedTutorData.preferred_pace as TutorPreferences['preferred_pace'],
          pace_flexibility: matchedTutorData.pace_flexibility ?? true,
          session_structure: matchedTutorData.session_structure as TutorPreferences['session_structure'],
          specialty_focus: matchedTutorData.specialty_focus as TutorPreferences['specialty_focus'],
          availability_windows: matchedTutorData.availability_windows || [],
          grade_level_comfort: matchedTutorData.grade_level_comfort || [],
        } : {
          teaching_style_strength: null,
          preferred_pace: null,
          pace_flexibility: true,
          session_structure: null,
          specialty_focus: null,
          availability_windows: [],
          grade_level_comfort: [],
        };

        return {
          id: tutor.id,
          name: tutor.name,
          preferences: prefs,
        };
      });

      // Get tutors with emails for proper matching
      const { data: tutorEmails } = await supabase
        .from('tutors')
        .select('id, email, name, teaching_style_strength, preferred_pace, pace_flexibility, session_structure, specialty_focus, availability_windows, grade_level_comfort');

      const enrichedTutors = tutors.map(tutor => {
        const tutorRecord = tutorEmails?.find(te => te.name === tutor.name || te.id === tutor.id);
        
        const prefs: TutorPreferences = tutorRecord ? {
          teaching_style_strength: tutorRecord.teaching_style_strength as TutorPreferences['teaching_style_strength'],
          preferred_pace: tutorRecord.preferred_pace as TutorPreferences['preferred_pace'],
          pace_flexibility: tutorRecord.pace_flexibility ?? true,
          session_structure: tutorRecord.session_structure as TutorPreferences['session_structure'],
          specialty_focus: tutorRecord.specialty_focus as TutorPreferences['specialty_focus'],
          availability_windows: tutorRecord.availability_windows || [],
          grade_level_comfort: tutorRecord.grade_level_comfort || [],
        } : {
          teaching_style_strength: null,
          preferred_pace: null,
          pace_flexibility: true,
          session_structure: null,
          specialty_focus: null,
          availability_windows: [],
          grade_level_comfort: [],
        };

        return {
          id: tutor.id,
          name: tutor.name,
          preferences: prefs,
        };
      });

      const topMatches = getTopMatches(studentPrefs, enrichedTutors, 3);
      setMatches(topMatches);
    } catch (error) {
      console.error('Error loading matches:', error);
      setMatches([]);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 75) return 'text-green-600 bg-green-50 border-green-200';
    if (percentage >= 50) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getMatchIcon = (match: boolean) => {
    return match ? (
      <Check className="h-3 w-3 text-green-600" />
    ) : (
      <AlertTriangle className="h-3 w-3 text-yellow-600" />
    );
  };

  if (!selectedStudentId) {
    return null;
  }

  return (
    <Card className="mb-4">
      <CardHeader className="py-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          Suggested Matches
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Based on learning preferences, teaching styles, pace compatibility, and schedule overlap.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !studentPrefsComplete ? (
          <div className="text-sm text-muted-foreground py-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            Student hasn't completed their preferences survey
          </div>
        ) : matches.length === 0 ? (
          <div className="text-sm text-muted-foreground py-2">
            No tutors available for matching
          </div>
        ) : (
          <div className="space-y-2">
            {matches.map((match, index) => (
              <div
                key={match.tutorId}
                className="flex items-center justify-between p-2 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0 text-xs">
                    {index + 1}
                  </Badge>
                  <div>
                    <p className="font-medium text-sm">{match.tutorName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              {getMatchIcon(match.breakdown.teachingStyle.match)}
                              <span>Style</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Teaching style: {match.breakdown.teachingStyle.score}/{match.breakdown.teachingStyle.max} pts</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              {getMatchIcon(match.breakdown.pace.match)}
                              <span>Pace</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Pace compatibility: {match.breakdown.pace.score}/{match.breakdown.pace.max} pts</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              {getMatchIcon(match.breakdown.schedule.match)}
                              <span>Schedule</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Schedule overlap: {match.breakdown.schedule.score}/{match.breakdown.schedule.max} pts</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`${getScoreColor(match.percentage)} border`}>
                    {match.percentage}%
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onSelectTutor(match.tutorId)}
                  >
                    Select
                  </Button>
                </div>
              </div>
            ))}
            {matches.some(m => !m.preferencesComplete) && (
              <p className="text-xs text-muted-foreground mt-2">
                ⚠️ Some tutors haven't completed their preferences
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SuggestedMatches;
