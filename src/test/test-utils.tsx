import type { ReactElement, ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Custom render function that wraps components with providers
function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) {
  // Test wrapper that provides necessary contexts
  function AllProviders({ children }: { children: ReactNode }) {
    return <>{children}</>;
  }

  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: AllProviders, ...options }),
  };
}

// Re-export render and other utilities from testing-library
export { render, screen, waitFor, within } from "@testing-library/react";
export { renderWithProviders };
export type { RenderOptions };
