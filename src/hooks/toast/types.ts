
import { type ToastProps } from '@/components/ui/toast';
import React from 'react';

export type ToastActionElement = React.ReactElement;

export type ToasterToast = {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
  variant?: 'default' | 'destructive';
}

export const TOAST_LIMIT = 5;
export const TOAST_REMOVE_DELAY = 1_000_000;

export type ToastOptions = Omit<ToasterToast, "id">;

export interface ToastState {
  toasts: ToasterToast[];
}
