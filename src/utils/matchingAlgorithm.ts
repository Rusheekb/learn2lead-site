// Tutor-Student Matching Algorithm
// Calculates compatibility scores based on preferences

export interface StudentPreferences {
  learning_pace: 'slow' | 'moderate' | 'fast' | null;
  teaching_style_pref: 'visual' | 'verbal' | 'hands_on' | 'mixed' | null;
  session_structure_pref: 'structured' | 'flexible' | 'mixed' | null;
  primary_goal: 'catch_up' | 'maintain' | 'get_ahead' | 'test_prep' | null;
  availability_windows: string[];
  communication_pref: 'encouraging' | 'direct' | 'balanced' | null;
  grade?: string | null;
}

export interface TutorPreferences {
  teaching_style_strength: 'visual' | 'verbal' | 'hands_on' | 'mixed' | null;
  preferred_pace: 'slow' | 'moderate' | 'fast' | null;
  pace_flexibility: boolean;
  session_structure: 'structured' | 'flexible' | 'mixed' | null;
  specialty_focus: 'struggling' | 'maintaining' | 'advanced' | 'all' | null;
  availability_windows: string[];
  grade_level_comfort: string[];
}

export interface MatchBreakdown {
  teachingStyle: { score: number; max: number; match: boolean };
  pace: { score: number; max: number; match: boolean };
  structure: { score: number; max: number; match: boolean };
  goal: { score: number; max: number; match: boolean };
  schedule: { score: number; max: number; match: boolean };
}

export interface MatchResult {
  tutorId: string;
  tutorName: string;
  score: number;
  maxScore: number;
  percentage: number;
  breakdown: MatchBreakdown;
  preferencesComplete: boolean;
}

// Weight configuration for each matching criterion
const WEIGHTS = {
  teachingStyle: 25,
  pace: 25,
  structure: 15,
  goal: 20,
  schedule: 15,
};

/**
 * Calculate teaching style compatibility
 */
function calculateTeachingStyleMatch(
  studentPref: StudentPreferences['teaching_style_pref'],
  tutorStrength: TutorPreferences['teaching_style_strength']
): { score: number; match: boolean } {
  if (!studentPref || !tutorStrength) {
    return { score: 0, match: false };
  }
  
  // Perfect match
  if (studentPref === tutorStrength) {
    return { score: WEIGHTS.teachingStyle, match: true };
  }
  
  // Mixed is compatible with everything
  if (studentPref === 'mixed' || tutorStrength === 'mixed') {
    return { score: WEIGHTS.teachingStyle * 0.8, match: true };
  }
  
  // No match
  return { score: WEIGHTS.teachingStyle * 0.3, match: false };
}

/**
 * Calculate pace compatibility
 */
function calculatePaceMatch(
  studentPace: StudentPreferences['learning_pace'],
  tutorPace: TutorPreferences['preferred_pace'],
  paceFlexibility: boolean
): { score: number; match: boolean } {
  if (!studentPace || !tutorPace) {
    return { score: 0, match: false };
  }
  
  // Perfect match
  if (studentPace === tutorPace) {
    return { score: WEIGHTS.pace, match: true };
  }
  
  // Tutor is flexible with pace
  if (paceFlexibility) {
    return { score: WEIGHTS.pace * 0.8, match: true };
  }
  
  // Adjacent paces (slow-moderate or moderate-fast)
  const paceOrder = ['slow', 'moderate', 'fast'];
  const studentIdx = paceOrder.indexOf(studentPace);
  const tutorIdx = paceOrder.indexOf(tutorPace);
  
  if (Math.abs(studentIdx - tutorIdx) === 1) {
    return { score: WEIGHTS.pace * 0.5, match: false };
  }
  
  // Opposite paces
  return { score: WEIGHTS.pace * 0.2, match: false };
}

/**
 * Calculate session structure compatibility
 */
function calculateStructureMatch(
  studentPref: StudentPreferences['session_structure_pref'],
  tutorStructure: TutorPreferences['session_structure']
): { score: number; match: boolean } {
  if (!studentPref || !tutorStructure) {
    return { score: 0, match: false };
  }
  
  // Perfect match
  if (studentPref === tutorStructure) {
    return { score: WEIGHTS.structure, match: true };
  }
  
  // Mixed is compatible with everything
  if (studentPref === 'mixed' || tutorStructure === 'mixed') {
    return { score: WEIGHTS.structure * 0.8, match: true };
  }
  
  // No match
  return { score: WEIGHTS.structure * 0.3, match: false };
}

/**
 * Calculate goal/specialty alignment
 */
function calculateGoalMatch(
  studentGoal: StudentPreferences['primary_goal'],
  tutorSpecialty: TutorPreferences['specialty_focus']
): { score: number; match: boolean } {
  if (!studentGoal || !tutorSpecialty) {
    return { score: 0, match: false };
  }
  
  // Tutor handles all levels
  if (tutorSpecialty === 'all') {
    return { score: WEIGHTS.goal * 0.9, match: true };
  }
  
  // Direct mappings
  const goalToSpecialty: Record<string, string> = {
    'catch_up': 'struggling',
    'maintain': 'maintaining',
    'get_ahead': 'advanced',
    'test_prep': 'advanced',
  };
  
  if (goalToSpecialty[studentGoal] === tutorSpecialty) {
    return { score: WEIGHTS.goal, match: true };
  }
  
  // Partial match
  return { score: WEIGHTS.goal * 0.4, match: false };
}

/**
 * Calculate schedule overlap
 */
function calculateScheduleMatch(
  studentWindows: string[],
  tutorWindows: string[]
): { score: number; match: boolean } {
  if (!studentWindows?.length || !tutorWindows?.length) {
    return { score: 0, match: false };
  }
  
  const overlap = studentWindows.filter(w => tutorWindows.includes(w));
  const overlapRatio = overlap.length / Math.min(studentWindows.length, tutorWindows.length);
  
  if (overlapRatio >= 0.5) {
    return { score: WEIGHTS.schedule, match: true };
  } else if (overlapRatio > 0) {
    return { score: WEIGHTS.schedule * overlapRatio * 2, match: true };
  }
  
  return { score: 0, match: false };
}

/**
 * Check if student has enough preferences filled
 */
function hasStudentPreferences(student: StudentPreferences): boolean {
  const filledFields = [
    student.learning_pace,
    student.teaching_style_pref,
    student.session_structure_pref,
    student.primary_goal,
    student.communication_pref,
    student.availability_windows?.length > 0,
  ].filter(Boolean).length;
  
  return filledFields >= 3; // At least 3 fields filled
}

/**
 * Check if tutor has enough preferences filled
 */
function hasTutorPreferences(tutor: TutorPreferences): boolean {
  const filledFields = [
    tutor.teaching_style_strength,
    tutor.preferred_pace,
    tutor.session_structure,
    tutor.specialty_focus,
    tutor.availability_windows?.length > 0,
  ].filter(Boolean).length;
  
  return filledFields >= 3; // At least 3 fields filled
}

/**
 * Calculate match score between a student and tutor
 */
export function calculateMatchScore(
  student: StudentPreferences,
  tutor: TutorPreferences,
  tutorId: string,
  tutorName: string
): MatchResult {
  const teachingStyle = calculateTeachingStyleMatch(
    student.teaching_style_pref,
    tutor.teaching_style_strength
  );
  
  const pace = calculatePaceMatch(
    student.learning_pace,
    tutor.preferred_pace,
    tutor.pace_flexibility ?? true
  );
  
  const structure = calculateStructureMatch(
    student.session_structure_pref,
    tutor.session_structure
  );
  
  const goal = calculateGoalMatch(
    student.primary_goal,
    tutor.specialty_focus
  );
  
  const schedule = calculateScheduleMatch(
    student.availability_windows || [],
    tutor.availability_windows || []
  );
  
  const breakdown: MatchBreakdown = {
    teachingStyle: { ...teachingStyle, max: WEIGHTS.teachingStyle },
    pace: { ...pace, max: WEIGHTS.pace },
    structure: { ...structure, max: WEIGHTS.structure },
    goal: { ...goal, max: WEIGHTS.goal },
    schedule: { ...schedule, max: WEIGHTS.schedule },
  };
  
  const totalScore = 
    teachingStyle.score + 
    pace.score + 
    structure.score + 
    goal.score + 
    schedule.score;
  
  const maxScore = 
    WEIGHTS.teachingStyle + 
    WEIGHTS.pace + 
    WEIGHTS.structure + 
    WEIGHTS.goal + 
    WEIGHTS.schedule;
  
  const preferencesComplete = hasStudentPreferences(student) && hasTutorPreferences(tutor);
  
  return {
    tutorId,
    tutorName,
    score: Math.round(totalScore),
    maxScore,
    percentage: Math.round((totalScore / maxScore) * 100),
    breakdown,
    preferencesComplete,
  };
}

/**
 * Get top N tutor matches for a student
 */
export function getTopMatches(
  student: StudentPreferences,
  tutors: Array<{ id: string; name: string; preferences: TutorPreferences }>,
  topN: number = 3
): MatchResult[] {
  const results = tutors.map(tutor => 
    calculateMatchScore(student, tutor.preferences, tutor.id, tutor.name)
  );
  
  // Sort by score descending
  results.sort((a, b) => b.score - a.score);
  
  return results.slice(0, topN);
}

/**
 * Availability window options
 */
export const AVAILABILITY_OPTIONS = [
  { value: 'weekday_morning', label: 'Weekday Morning (8am-12pm)' },
  { value: 'weekday_afternoon', label: 'Weekday Afternoon (12pm-5pm)' },
  { value: 'weekday_evening', label: 'Weekday Evening (5pm-9pm)' },
  { value: 'weekend_morning', label: 'Weekend Morning (8am-12pm)' },
  { value: 'weekend_afternoon', label: 'Weekend Afternoon (12pm-5pm)' },
  { value: 'weekend_evening', label: 'Weekend Evening (5pm-9pm)' },
];

/**
 * Grade level options
 */
export const GRADE_LEVEL_OPTIONS = [
  { value: 'elementary', label: 'Elementary (K-5)' },
  { value: 'middle', label: 'Middle School (6-8)' },
  { value: 'high', label: 'High School (9-12)' },
  { value: 'college', label: 'College/University' },
];
