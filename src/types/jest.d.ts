/// <reference types="@testing-library/jest-dom" />

import '@testing-library/jest-dom';

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveClass(className: string): R;
      toHaveTextContent(text: string | RegExp): R;
      toBeVisible(): R;
      toBeDisabled(): R;
      toBeEnabled(): R;
      toHaveAttribute(attr: string, value?: string): R;
      toHaveStyle(style: Record<string, unknown>): R;
      toContainElement(element: HTMLElement | null): R;
      toHaveValue(value: string | string[] | number): R;
      toBeChecked(): R;
      toBePartiallyChecked(): R;
      toHaveFocus(): R;
      toBeEmpty(): R;
      toBeEmptyDOMElement(): R;
      toBeRequired(): R;
      toBeInvalid(): R;
      toBeValid(): R;
      toHaveDescription(description: string | RegExp): R;
      toHaveAccessibleDescription(description: string | RegExp): R;
      toHaveAccessibleName(name: string | RegExp): R;
      toHaveDisplayValue(value: string | RegExp | Array<string | RegExp>): R;
      toHaveErrorMessage(message: string | RegExp): R;
    }
  }
}
