import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { addChild, updateChild } from '@/services/family/mutations';
import { familyKeys } from '@/hooks/queries/useFamilyQueries';
import type { FamilyChild } from '@/services/family/types';

export interface ChildFormValues {
  firstName: string;
  lastName: string;
  grade: string;
  email: string;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const valuesFor = (child?: FamilyChild): ChildFormValues => ({
  firstName: child?.firstName ?? '',
  lastName: child?.lastName ?? '',
  grade: child?.grade ?? '',
  email: child?.email ?? '',
});

/**
 * State and saving for the add/edit-student form, shared by the dialog and
 * the first-run family setup.
 */
export function useChildForm(child?: FamilyChild) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<ChildFormValues>(() => valuesFor(child));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const reset = useCallback(() => {
    setValues(valuesFor(child));
    setError(null);
  }, [child]);

  const setField = (field: keyof ChildFormValues, value: string) =>
    setValues((v) => ({ ...v, [field]: value }));

  /** Validate and save; resolves to the saved first name, or null. */
  const submit = async (): Promise<string | null> => {
    const input = {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      grade: values.grade.trim(),
      email: values.email.trim(),
    };
    if (!input.firstName) {
      setError("Enter the student's first name.");
      return null;
    }
    if (input.email && !EMAIL_RE.test(input.email)) {
      setError('Enter a valid email address, or leave it blank.');
      return null;
    }
    setError(null);
    setIsSaving(true);
    try {
      if (child) await updateChild(child.studentId, input);
      else await addChild(input);
      await queryClient.invalidateQueries({ queryKey: familyKeys.all });
      return input.firstName;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  return { values, setField, error, isSaving, submit, reset };
}
