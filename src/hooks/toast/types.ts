
import * as React from "react";

export type ToastProps = {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  variant: "default" | "destructive";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export type ToastActionElement = React.ReactElement<{
  onAction: () => void;
}>;

export type ToastOptions = {
  title?: React.ReactNode;
  action?: ToastActionElement;
  duration?: number;
};

export type ToastVariant = "default" | "destructive";

export const TOAST_LIMIT = 5;
export const TOAST_REMOVE_DELAY = 1000;
