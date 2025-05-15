
import * as React from "react";

export type ToastProps = {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  variant: "default" | "destructive";
};

export type ToastActionElement = React.ReactElement<{
  onAction: () => void;
}>;

export const TOAST_LIMIT = 5;
export const TOAST_REMOVE_DELAY = 1000;
