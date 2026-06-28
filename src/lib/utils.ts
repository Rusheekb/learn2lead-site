import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const { message } = error;
    if (message && message !== '[object Object]') return message;
    const hint = (error as any)?.hint;
    if (typeof hint === 'string' && hint) return hint;
    const code = (error as any)?.code;
    if (code) return `Database error (${code})`;
    return 'An unexpected error occurred';
  }
  const e = error as any;
  if (
    typeof e?.message === 'string' &&
    e.message &&
    e.message !== '[object Object]'
  ) {
    return e.message;
  }
  try {
    return JSON.stringify(e) || 'An unexpected error occurred';
  } catch {
    return 'An unexpected error occurred';
  }
}
