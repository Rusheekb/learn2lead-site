import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AVAILABILITY_OPTIONS, GRADE_LEVEL_OPTIONS } from '@/utils/matchingAlgorithm';
import { Loader2, CheckCircle2 } from 'lucide-react';

interface PreferencesFormProps {
  role: 'student' | 'tutor';
  userEmail: string;
}

interface StudentPrefs {
  learning_pace: string;
  teaching_style_pref: string;
  session_structure_pref: string;
  primary_goal: string;
  availability_windows: string[];
  communication_pref: string;
}

interface TutorPrefs {
  teaching_style_strength: string;
  preferred_pace: string;
  pace_flexibility: boolean;
  session_structure: string;
  specialty_focus: string;
  availability_windows: string[];
  grade_level_comfort: string[];
}

const PreferencesForm: React.FC<PreferencesFormProps> = ({ role, userEmail }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Student preferences
  const [studentPrefs, setStudentPrefs] = useState<StudentPrefs>({
    learning_pace: '',
    teaching_style_pref: '',
    session_structure_pref: '',
    primary_goal: '',
    availability_windows: [],
    communication_pref: '',
  });
  
  // Tutor preferences
  const [tutorPrefs, setTutorPrefs] = useState<TutorPrefs>({
    teaching_style_strength: '',
    preferred_pace: '',
    pace_flexibility: true,
    session_structure: '',
    specialty_focus: '',
    availability_windows: [],
    grade_level_comfort: [],
  });

  useEffect(() => {
    loadPreferences();
  }, [userEmail, role]);

  const loadPreferences = async () => {
    setLoading(true);
    try {
      if (role === 'student') {
        const { data, error } = await supabase
          .from('students')
          .select('learning_pace, teaching_style_pref, session_structure_pref, primary_goal, availability_windows, communication_pref')
          .eq('email', userEmail)
          .single();
        
        if (data && !error) {
          setStudentPrefs({
            learning_pace: (data.learning_pace as string) || '',
            teaching_style_pref: (data.teaching_style_pref as string) || '',
            session_structure_pref: (data.session_structure_pref as string) || '',
            primary_goal: (data.primary_goal as string) || '',
            availability_windows: data.availability_windows || [],
            communication_pref: (data.communication_pref as string) || '',
          });
        }
      } else {
        const { data, error } = await supabase
          .from('tutors')
          .select('teaching_style_strength, preferred_pace, pace_flexibility, session_structure, specialty_focus, availability_windows, grade_level_comfort')
          .eq('email', userEmail)
          .single();
        
        if (data && !error) {
          setTutorPrefs({
            teaching_style_strength: (data.teaching_style_strength as string) || '',
            preferred_pace: (data.preferred_pace as string) || '',
            pace_flexibility: data.pace_flexibility ?? true,
            session_structure: (data.session_structure as string) || '',
            specialty_focus: (data.specialty_focus as string) || '',
            availability_windows: data.availability_windows || [],
            grade_level_comfort: data.grade_level_comfort || [],
          });
        }
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (role === 'student') {
        const { error } = await supabase
          .from('students')
          .update({
            learning_pace: studentPrefs.learning_pace || null,
            teaching_style_pref: studentPrefs.teaching_style_pref || null,
            session_structure_pref: studentPrefs.session_structure_pref || null,
            primary_goal: studentPrefs.primary_goal || null,
            availability_windows: studentPrefs.availability_windows,
            communication_pref: studentPrefs.communication_pref || null,
          } as any)
          .eq('email', userEmail);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tutors')
          .update({
            teaching_style_strength: tutorPrefs.teaching_style_strength || null,
            preferred_pace: tutorPrefs.preferred_pace || null,
            pace_flexibility: tutorPrefs.pace_flexibility,
            session_structure: tutorPrefs.session_structure || null,
            specialty_focus: tutorPrefs.specialty_focus || null,
            availability_windows: tutorPrefs.availability_windows,
            grade_level_comfort: tutorPrefs.grade_level_comfort,
          } as any)
          .eq('email', userEmail);
        
        if (error) throw error;
      }
      
      toast.success('Preferences saved successfully');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const toggleArrayItem = (
    array: string[],
    item: string,
    setter: (arr: string[]) => void
  ) => {
    if (array.includes(item)) {
      setter(array.filter(i => i !== item));
    } else {
      setter([...array, item]);
    }
  };

  // Calculate profile completeness
  const completeness = useMemo(() => {
    if (role === 'student') {
      const fields = [
        studentPrefs.learning_pace,
        studentPrefs.teaching_style_pref,
        studentPrefs.session_structure_pref,
        studentPrefs.primary_goal,
        studentPrefs.availability_windows.length > 0,
        studentPrefs.communication_pref,
      ];
      const filled = fields.filter(Boolean).length;
      return Math.round((filled / 6) * 100);
    } else {
      const fields = [
        tutorPrefs.teaching_style_strength,
        tutorPrefs.preferred_pace,
        true, // pace_flexibility always has a value (boolean)
        tutorPrefs.session_structure,
        tutorPrefs.specialty_focus,
        tutorPrefs.availability_windows.length > 0,
        tutorPrefs.grade_level_comfort.length > 0,
      ];
      const filled = fields.filter(Boolean).length;
      return Math.round((filled / 7) * 100);
    }
  }, [studentPrefs, tutorPrefs, role]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Completeness Indicator */}
      <Card className={completeness === 100 ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20' : ''}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            {completeness === 100 ? (
              <CheckCircle2 className="h-8 w-8 text-green-600 flex-shrink-0" />
            ) : (
              <div className="h-8 w-8 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium text-muted-foreground">{completeness}%</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">
                  {completeness === 100 ? 'Profile Complete!' : 'Profile Completeness'}
                </span>
                <span className="text-sm text-muted-foreground">{completeness}%</span>
              </div>
              <Progress value={completeness} className="h-2" />
              {completeness < 100 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Complete your preferences to help us find the best {role === 'student' ? 'tutor' : 'student'} matches
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Learning Preferences</CardTitle>
          <CardDescription>
            Help us match you with the best {role === 'student' ? 'tutor' : 'students'} by sharing your preferences.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {role === 'student' ? (
            <>
              {/* Learning Pace */}
              <div className="space-y-3">
                <Label className="text-base font-medium">What pace do you prefer?</Label>
                <RadioGroup
                  value={studentPrefs.learning_pace}
                  onValueChange={(v) => setStudentPrefs(p => ({ ...p, learning_pace: v }))}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-2"
                >
                  <div className="flex items-center space-x-2 border rounded-lg p-3">
                    <RadioGroupItem value="slow" id="pace-slow" />
                    <Label htmlFor="pace-slow" className="cursor-pointer">Slow & steady</Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-lg p-3">
                    <RadioGroupItem value="moderate" id="pace-moderate" />
                    <Label htmlFor="pace-moderate" className="cursor-pointer">Moderate</Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-lg p-3">
                    <RadioGroupItem value="fast" id="pace-fast" />
                    <Label htmlFor="pace-fast" className="cursor-pointer">Fast-paced</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Teaching Style */}
              <div className="space-y-3">
                <Label className="text-base font-medium">How do you learn best?</Label>
                <RadioGroup
                  value={studentPrefs.teaching_style_pref}
                  onValueChange={(v) => setStudentPrefs(p => ({ ...p, teaching_style_pref: v }))}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                >
                  <div className="flex items-center space-x-2 border rounded-lg p-3">
                    <RadioGroupItem value="visual" id="style-visual" />
                    <Label htmlFor="style-visual" className="cursor-pointer">Visual (diagrams, charts)</Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-lg p-3">
                    <RadioGroupItem value="verbal" id="style-verbal" />
                    <Label htmlFor="style-verbal" className="cursor-pointer">Verbal (explanations, discussion)</Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-lg p-3">
                    <RadioGroupItem value="hands_on" id="style-hands" />
                    <Label htmlFor="style-hands" className="cursor-pointer">Hands-on (practice problems)</Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-lg p-3">
                    <RadioGroupItem value="mixed" id="style-mixed" />
                    <Label htmlFor="style-mixed" className="cursor-pointer">Mixed approach</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Session Structure */}
              <div className="space-y-3">
                <Label className="text-base font-medium">What session structure do you prefer?</Label>
                <RadioGroup
                  value={studentPrefs.session_structure_pref}
                  onValueChange={(v) => setStudentPrefs(p => ({ ...p, session_structure_pref: v }))}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-2"
                >
                  <div className="flex items-center space-x-2 border rounded-lg p-3">
                    <RadioGroupItem value="structured" id="struct-structured" />
                    <Label htmlFor="struct-structured" className="cursor-pointer">Structured (planned agenda)</Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-lg p-3">
                    <RadioGroupItem value="flexible" id="struct-flexible" />
                    <Label htmlFor="struct-flexible" className="cursor-pointer">Flexible (go with the flow)</Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-lg p-3">
                    <RadioGroupItem value="mixed" id="struct-mixed" />
                    <Label htmlFor="struct-mixed" className="cursor-pointer">Mixed</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Primary Goal */}
              <div className="space-y-3">
                <Label className="text-base font-medium">What's your main goal?</Label>
                <RadioGroup
                  value={studentPrefs.primary_goal}
                  onValueChange={(v) => setStudentPrefs(p => ({ ...p, primary_goal: v }))}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                >
                  <div className="flex items-center space-x-2 border rounded-lg p-3">
                    <RadioGroupItem value="catch_up" id="goal-catch" />
                    <Label htmlFor="goal-catch" className="cursor-pointer">Catch up / improve grades</Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-lg p-3">
                    <RadioGroupItem value="maintain" id="goal-maintain" />
                    <Label htmlFor="goal-maintain" className="cursor-pointer">Maintain current level</Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-lg p-3">
                    <RadioGroupItem value="get_ahead" id="goal-ahead" />
                    <Label htmlFor="goal-ahead" className="cursor-pointer">Get ahead / enrichment</Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-lg p-3">
                    <RadioGroupItem value="test_prep" id="goal-test" />
                    <Label htmlFor="goal-test" className="cursor-pointer">Test preparation</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Communication Style */}
              <div className="space-y-3">
                <Label className="text-base font-medium">What communication style do you prefer?</Label>
                <RadioGroup
                  value={studentPrefs.communication_pref}
                  onValueChange={(v) => setStudentPrefs(p => ({ ...p, communication_pref: v }))}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-2"
                >
                  <div className="flex items-center space-x-2 border rounded-lg p-3">
                    <RadioGroupItem value="encouraging" id="comm-encouraging" />
                    <Label htmlFor="comm-encouraging" className="cursor-pointer">Encouraging & supportive</Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-lg p-3">
                    <RadioGroupItem value="direct" id="comm-direct" />
                    <Label htmlFor="comm-direct" className="cursor-pointer">Direct & to-the-point</Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-lg p-3">
                    <RadioGroupItem value="balanced" id="comm-balanced" />
                    <Label htmlFor="comm-balanced" className="cursor-pointer">Balanced</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Availability */}
              <div className="space-y-3">
                <Label className="text-base font-medium">When are you available? (select all that apply)</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {AVAILABILITY_OPTIONS.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2 border rounded-lg p-3">
                      <Checkbox
                        id={`avail-${option.value}`}
                        checked={studentPrefs.availability_windows.includes(option.value)}
                        onCheckedChange={() => 
                          toggleArrayItem(
                            studentPrefs.availability_windows, 
                            option.value, 
                            (arr) => setStudentPrefs(p => ({ ...p, availability_windows: arr }))
                          )
                        }
                      />
                      <Label htmlFor={`avail-${option.value}`} className="cursor-pointer">{option.label}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Teaching Style Strength */}
              <div className="space-y-3">
                <Label className="text-base font-medium">What's your primary teaching style?</Label>
                <RadioGroup
                  value={tutorPrefs.teaching_style_strength}
                  onValueChange={(v) => setTutorPrefs(p => ({ ...p, teaching_style_strength: v }))}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                >
                  <div className="flex items-center space-x-2 border rounded-lg p-3">
                    <RadioGroupItem value="visual" id="t-style-visual" />
                    <Label htmlFor="t-style-visual" className="cursor-pointer">Visual (diagrams, charts)</Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-lg p-3">
                    <RadioGroupItem value="verbal" id="t-style-verbal" />
                    <Label htmlFor="t-style-verbal" className="cursor-pointer">Verbal (explanations, discussion)</Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-lg p-3">
                    <RadioGroupItem value="hands_on" id="t-style-hands" />
                    <Label htmlFor="t-style-hands" className="cursor-pointer">Hands-on (practice problems)</Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-lg p-3">
                    <RadioGroupItem value="mixed" id="t-style-mixed" />
                    <Label htmlFor="t-style-mixed" className="cursor-pointer">Mixed / adaptable</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Preferred Pace */}
              <div className="space-y-3">
                <Label className="text-base font-medium">What pace do you prefer teaching at?</Label>
                <RadioGroup
                  value={tutorPrefs.preferred_pace}
                  onValueChange={(v) => setTutorPrefs(p => ({ ...p, preferred_pace: v }))}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-2"
                >
                  <div className="flex items-center space-x-2 border rounded-lg p-3">
                    <RadioGroupItem value="slow" id="t-pace-slow" />
                    <Label htmlFor="t-pace-slow" className="cursor-pointer">Slow & thorough</Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-lg p-3">
                    <RadioGroupItem value="moderate" id="t-pace-moderate" />
                    <Label htmlFor="t-pace-moderate" className="cursor-pointer">Moderate</Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-lg p-3">
                    <RadioGroupItem value="fast" id="t-pace-fast" />
                    <Label htmlFor="t-pace-fast" className="cursor-pointer">Fast-paced</Label>
                  </div>
                </RadioGroup>
                <div className="flex items-center space-x-2 mt-2">
                  <Checkbox
                    id="pace-flexible"
                    checked={tutorPrefs.pace_flexibility}
                    onCheckedChange={(checked) => 
                      setTutorPrefs(p => ({ ...p, pace_flexibility: checked as boolean }))
                    }
                  />
                  <Label htmlFor="pace-flexible" className="cursor-pointer">I can adapt my pace to student needs</Label>
                </div>
              </div>

              {/* Session Structure */}
              <div className="space-y-3">
                <Label className="text-base font-medium">How do you typically structure sessions?</Label>
                <RadioGroup
                  value={tutorPrefs.session_structure}
                  onValueChange={(v) => setTutorPrefs(p => ({ ...p, session_structure: v }))}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-2"
                >
                  <div className="flex items-center space-x-2 border rounded-lg p-3">
                    <RadioGroupItem value="structured" id="t-struct-structured" />
                    <Label htmlFor="t-struct-structured" className="cursor-pointer">Structured (planned agenda)</Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-lg p-3">
                    <RadioGroupItem value="flexible" id="t-struct-flexible" />
                    <Label htmlFor="t-struct-flexible" className="cursor-pointer">Flexible (student-led)</Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-lg p-3">
                    <RadioGroupItem value="mixed" id="t-struct-mixed" />
                    <Label htmlFor="t-struct-mixed" className="cursor-pointer">Mixed / adaptable</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Specialty Focus */}
              <div className="space-y-3">
                <Label className="text-base font-medium">What type of students do you work best with?</Label>
                <RadioGroup
                  value={tutorPrefs.specialty_focus}
                  onValueChange={(v) => setTutorPrefs(p => ({ ...p, specialty_focus: v }))}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                >
                  <div className="flex items-center space-x-2 border rounded-lg p-3">
                    <RadioGroupItem value="struggling" id="spec-struggling" />
                    <Label htmlFor="spec-struggling" className="cursor-pointer">Struggling students (catch-up)</Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-lg p-3">
                    <RadioGroupItem value="maintaining" id="spec-maintaining" />
                    <Label htmlFor="spec-maintaining" className="cursor-pointer">Students maintaining grades</Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-lg p-3">
                    <RadioGroupItem value="advanced" id="spec-advanced" />
                    <Label htmlFor="spec-advanced" className="cursor-pointer">Advanced / gifted students</Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-lg p-3">
                    <RadioGroupItem value="all" id="spec-all" />
                    <Label htmlFor="spec-all" className="cursor-pointer">All student levels</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Grade Levels */}
              <div className="space-y-3">
                <Label className="text-base font-medium">What grade levels are you comfortable teaching?</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {GRADE_LEVEL_OPTIONS.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2 border rounded-lg p-3">
                      <Checkbox
                        id={`grade-${option.value}`}
                        checked={tutorPrefs.grade_level_comfort.includes(option.value)}
                        onCheckedChange={() => 
                          toggleArrayItem(
                            tutorPrefs.grade_level_comfort, 
                            option.value, 
                            (arr) => setTutorPrefs(p => ({ ...p, grade_level_comfort: arr }))
                          )
                        }
                      />
                      <Label htmlFor={`grade-${option.value}`} className="cursor-pointer">{option.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Availability */}
              <div className="space-y-3">
                <Label className="text-base font-medium">When are you available to tutor? (select all that apply)</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {AVAILABILITY_OPTIONS.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2 border rounded-lg p-3">
                      <Checkbox
                        id={`t-avail-${option.value}`}
                        checked={tutorPrefs.availability_windows.includes(option.value)}
                        onCheckedChange={() => 
                          toggleArrayItem(
                            tutorPrefs.availability_windows, 
                            option.value, 
                            (arr) => setTutorPrefs(p => ({ ...p, availability_windows: arr }))
                          )
                        }
                      />
                      <Label htmlFor={`t-avail-${option.value}`} className="cursor-pointer">{option.label}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Preferences'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PreferencesForm;
