import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ChildFormValues } from './useChildForm';

interface ChildFormFieldsProps {
  values: ChildFormValues;
  setField: (field: keyof ChildFormValues, value: string) => void;
  error: string | null;
  /** Keeps input ids unique when the form appears twice on a page. */
  idPrefix?: string;
  autoFocus?: boolean;
}

export const ChildFormFields: React.FC<ChildFormFieldsProps> = ({
  values,
  setField,
  error,
  idPrefix = 'child',
  autoFocus,
}) => (
  <div className="grid gap-4">
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-first-name`}>First name</Label>
        <Input
          id={`${idPrefix}-first-name`}
          value={values.firstName}
          onChange={(e) => setField('firstName', e.target.value)}
          autoComplete="off"
          autoFocus={autoFocus}
          required
          aria-required="true"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-last-name`}>Last name</Label>
        <Input
          id={`${idPrefix}-last-name`}
          value={values.lastName}
          onChange={(e) => setField('lastName', e.target.value)}
          autoComplete="off"
        />
      </div>
    </div>
    <div className="space-y-2">
      <Label htmlFor={`${idPrefix}-grade`}>Grade (optional)</Label>
      <Input
        id={`${idPrefix}-grade`}
        value={values.grade}
        onChange={(e) => setField('grade', e.target.value)}
        placeholder="e.g. 7th"
        autoComplete="off"
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor={`${idPrefix}-email`}>Student’s email (optional)</Label>
      <Input
        id={`${idPrefix}-email`}
        type="email"
        value={values.email}
        onChange={(e) => setField('email', e.target.value)}
        autoComplete="off"
        aria-describedby={`${idPrefix}-email-hint`}
      />
      <p
        id={`${idPrefix}-email-hint`}
        className="text-xs text-muted-foreground"
      >
        So they get their own class reminders and homework notes. Billing emails
        always come to you.
      </p>
    </div>
    {error && (
      <p role="alert" className="text-sm text-destructive">
        {error}
      </p>
    )}
  </div>
);
