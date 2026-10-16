/**
 * Where a new parent is in the first-run family setup. Kept per user in
 * localStorage so leaving mid-way (e.g. to buy hours) resumes at the same
 * step. A family that already has students and no saved step (converted by
 * an admin, or linked through an invite) skips setup.
 */
export type FamilySetupStep = 'students' | 'hours' | 'next' | 'done';

const STEPS: FamilySetupStep[] = ['students', 'hours', 'next', 'done'];
const key = (userId: string) => `learn2lead.familySetup.${userId}`;

export function getFamilySetupStep(
  userId: string,
  studentCount: number
): FamilySetupStep {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(key(userId));
  } catch {
    // Storage unavailable — fall through to the default below.
  }
  if (saved && (STEPS as string[]).includes(saved)) {
    return saved as FamilySetupStep;
  }
  return studentCount > 0 ? 'done' : 'students';
}

export function setFamilySetupStep(
  userId: string,
  step: FamilySetupStep
): void {
  try {
    localStorage.setItem(key(userId), step);
  } catch {
    // ignore
  }
}
