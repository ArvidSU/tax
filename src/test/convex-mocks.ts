import { vi } from "vitest";

// Mock Convex hooks
export const mockUseQuery = vi.fn();
export const mockUseMutation = vi.fn();

// Helper to create a mock query result
export function createMockQueryResult<T>(data: T | undefined) {
  return data;
}

// Helper to create a mock mutation function
export function createMockMutation<T = unknown, R = unknown>(
  implementation?: (args: T) => Promise<R>
) {
  const mockFn = vi.fn(implementation || (() => Promise.resolve({} as R)));
  return mockFn;
}

// Reset all mocks between tests
export function resetConvexMocks() {
  mockUseQuery.mockReset();
  mockUseMutation.mockReset();
}
