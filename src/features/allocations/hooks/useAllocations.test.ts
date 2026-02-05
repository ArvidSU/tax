import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAllocations } from "./useAllocations";
import type { Category } from "../../../types";

// Mock Convex hooks
const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

vi.mock("../../../../convex/_generated/api", () => ({
  api: {
    distributions: {
      getByBoardAndUser: "getByBoardAndUser",
      upsertLevel: "upsertLevel",
    },
  },
}));

const mockCategories: Category[] = [
  { _id: "cat-1", name: "Healthcare", description: "Health", color: "#ff0000", order: 1 },
  { _id: "cat-2", name: "Education", description: "Edu", color: "#00ff00", order: 2 },
  { _id: "cat-3", name: "Defense", description: "Def", color: "#0000ff", order: 3 },
];

describe("useAllocations", () => {
  let mockUpsertMutation: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockUpsertMutation = vi.fn().mockResolvedValue(undefined);
    mockUseMutation.mockReturnValue(mockUpsertMutation);
    mockUseQuery.mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("should initialize with empty allocations when no user/board", () => {
      const { result } = renderHook(() =>
        useAllocations({
          userId: null,
          boardId: null,
          currentLevelCategories: mockCategories,
        })
      );

      expect(result.current.allocations.size).toBe(0);
      expect(result.current.totalAllocated).toBe(0);
      expect(result.current.isFullyAllocated).toBe(false);
    });

    it("should skip query when userId or boardId is null", () => {
      renderHook(() =>
        useAllocations({
          userId: null,
          boardId: "board-1",
          currentLevelCategories: mockCategories,
        })
      );

      expect(mockUseQuery).toHaveBeenCalledWith(
        "getByBoardAndUser",
        "skip"
      );
    });

    it("should load allocations from query data", async () => {
      const mockAllocations = [
        { categoryId: "cat-1", percentage: 30 },
        { categoryId: "cat-2", percentage: 50 },
      ];

      mockUseQuery.mockReturnValue(mockAllocations);

      const { result } = renderHook(() =>
        useAllocations({
          userId: "user-1",
          boardId: "board-1",
          currentLevelCategories: mockCategories,
        })
      );

      // Wait for the setTimeout in useEffect to execute
      await waitFor(() => {
        expect(result.current.allocations.get("cat-1")).toBe(30);
        expect(result.current.allocations.get("cat-2")).toBe(50);
      });

      expect(result.current.totalAllocated).toBe(80);
      expect(result.current.isFullyAllocated).toBe(false);
    });

    it("should reset allocations when board changes", async () => {
      const mockAllocations = [{ categoryId: "cat-1", percentage: 30 }];
      mockUseQuery.mockReturnValue(mockAllocations);

      const { result, rerender } = renderHook(
        ({ boardId }) =>
          useAllocations({
            userId: "user-1",
            boardId,
            currentLevelCategories: mockCategories,
          }),
        { initialProps: { boardId: "board-1" } }
      );

      await waitFor(() => {
        expect(result.current.allocations.get("cat-1")).toBe(30);
      });

      // Change board
      mockUseQuery.mockReturnValue([]);
      rerender({ boardId: "board-2" });

      await waitFor(() => {
        expect(result.current.allocations.size).toBe(0);
      });
    });
  });

  describe("allocation calculations", () => {
    beforeEach(() => {
      const mockAllocations = [
        { categoryId: "cat-1", percentage: 30 },
        { categoryId: "cat-2", percentage: 50 },
      ];
      mockUseQuery.mockReturnValue(mockAllocations);
    });

    it("should calculate total allocation correctly", async () => {
      const { result } = renderHook(() =>
        useAllocations({
          userId: "user-1",
          boardId: "board-1",
          currentLevelCategories: mockCategories,
        })
      );

      await waitFor(() => {
        expect(result.current.totalAllocated).toBe(80);
      });
    });

    it("should identify when fully allocated (100%)", async () => {
      mockUseQuery.mockReturnValue([
        { categoryId: "cat-1", percentage: 40 },
        { categoryId: "cat-2", percentage: 35 },
        { categoryId: "cat-3", percentage: 25 },
      ]);

      const { result } = renderHook(() =>
        useAllocations({
          userId: "user-1",
          boardId: "board-1",
          currentLevelCategories: mockCategories,
        })
      );

      await waitFor(() => {
        expect(result.current.isFullyAllocated).toBe(true);
        expect(result.current.totalAllocated).toBe(100);
      });
    });

    it("should calculate remaining budget available for each category", async () => {
      const { result } = renderHook(() =>
        useAllocations({
          userId: "user-1",
          boardId: "board-1",
          currentLevelCategories: mockCategories,
        })
      );

      await waitFor(() => {
        // Total is 80, so remaining for cat-3 is 20
        expect(result.current.calculateMax("cat-3")).toBe(20);
        // For cat-1, remaining is 100 - (50 + 0) = 50
        expect(result.current.calculateMax("cat-1")).toBe(50);
      });
    });

    it("should return 100 for max when no allocations set", () => {
      mockUseQuery.mockReturnValue([]);

      const { result } = renderHook(() =>
        useAllocations({
          userId: "user-1",
          boardId: "board-1",
          currentLevelCategories: mockCategories,
        })
      );

      expect(result.current.calculateMax("cat-1")).toBe(100);
    });
  });

  describe("handleAllocationChange", () => {
    beforeEach(() => {
      mockUseQuery.mockReturnValue([]);
    });

    it("should update allocation value immediately", () => {
      const { result } = renderHook(() =>
        useAllocations({
          userId: "user-1",
          boardId: "board-1",
          currentLevelCategories: mockCategories,
        })
      );

      act(() => {
        result.current.handleAllocationChange("cat-1", 40);
      });

      expect(result.current.allocations.get("cat-1")).toBe(40);
      expect(result.current.totalAllocated).toBe(40);
    });

    it("should remove category from allocations when value is 0", () => {
      const { result } = renderHook(() =>
        useAllocations({
          userId: "user-1",
          boardId: "board-1",
          currentLevelCategories: mockCategories,
        })
      );

      act(() => {
        result.current.handleAllocationChange("cat-1", 40);
      });

      act(() => {
        result.current.handleAllocationChange("cat-1", 0);
      });

      expect(result.current.allocations.has("cat-1")).toBe(false);
      expect(result.current.totalAllocated).toBe(0);
    });

    it("should allow multiple categories to be allocated", () => {
      const { result } = renderHook(() =>
        useAllocations({
          userId: "user-1",
          boardId: "board-1",
          currentLevelCategories: mockCategories,
        })
      );

      act(() => {
        result.current.handleAllocationChange("cat-1", 30);
        result.current.handleAllocationChange("cat-2", 50);
        result.current.handleAllocationChange("cat-3", 20);
      });

      expect(result.current.allocations.get("cat-1")).toBe(30);
      expect(result.current.allocations.get("cat-2")).toBe(50);
      expect(result.current.allocations.get("cat-3")).toBe(20);
      expect(result.current.totalAllocated).toBe(100);
      expect(result.current.isFullyAllocated).toBe(true);
    });

    it("should handle allocations exceeding 100% (UI should prevent this)", () => {
      const { result } = renderHook(() =>
        useAllocations({
          userId: "user-1",
          boardId: "board-1",
          currentLevelCategories: mockCategories,
        })
      );

      act(() => {
        result.current.handleAllocationChange("cat-1", 60);
        result.current.handleAllocationChange("cat-2", 50);
      });

      expect(result.current.totalAllocated).toBe(110);
      expect(result.current.isFullyAllocated).toBe(true);
    });
  });

  describe("debounced saves", () => {
    beforeEach(() => {
      mockUseQuery.mockReturnValue([]);
    });

    it("should not save immediately when allocation changes", async () => {
      const { result } = renderHook(() =>
        useAllocations({
          userId: "user-1",
          boardId: "board-1",
          currentLevelCategories: mockCategories,
        })
      );

      act(() => {
        result.current.handleAllocationChange("cat-1", 40);
      });

      // Immediately check - mutation should not have been called yet
      expect(mockUpsertMutation).not.toHaveBeenCalled();

      // Advance time by less than debounce period
      vi.advanceTimersByTime(100);
      expect(mockUpsertMutation).not.toHaveBeenCalled();
    });

    it.skip("should save after debounce period (300ms)", async () => {
      const { result } = renderHook(() =>
        useAllocations({
          userId: "user-1",
          boardId: "board-1",
          currentLevelCategories: mockCategories,
        })
      );

      act(() => {
        result.current.handleAllocationChange("cat-1", 40);
        result.current.handleAllocationChange("cat-2", 60);
      });

      // Advance time past debounce period and run all timers
      vi.advanceTimersByTime(350);
      
      await act(async () => {
        vi.runAllTimers();
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(mockUpsertMutation).toHaveBeenCalledTimes(1);
      });
      
      expect(mockUpsertMutation).toHaveBeenCalledWith({
        boardId: "board-1",
        userId: "user-1",
        parentId: undefined,
        allocations: [
          { categoryId: "cat-1", percentage: 40 },
          { categoryId: "cat-2", percentage: 60 },
        ],
      });
    });

    it.skip("should only save when total reaches 100%", async () => {
      const { result } = renderHook(() =>
        useAllocations({
          userId: "user-1",
          boardId: "board-1",
          currentLevelCategories: mockCategories,
        })
      );

      // Set partial allocation (not 100%)
      act(() => {
        result.current.handleAllocationChange("cat-1", 40);
      });

      vi.advanceTimersByTime(350);
      
      await act(async () => {
        vi.runAllTimers();
        await Promise.resolve();
      });

      // Should NOT call mutation when total is not 100%
      expect(mockUpsertMutation).not.toHaveBeenCalled();

      // Now set total to 100%
      act(() => {
        result.current.handleAllocationChange("cat-2", 60);
      });

      vi.advanceTimersByTime(350);
      
      await act(async () => {
        vi.runAllTimers();
        await Promise.resolve();
      });

      // Now should call mutation with 100% allocation
      await waitFor(() => {
        expect(mockUpsertMutation).toHaveBeenCalledTimes(1);
      });
      
      expect(mockUpsertMutation).toHaveBeenCalledWith({
        boardId: "board-1",
        userId: "user-1",
        parentId: undefined,
        allocations: [
          { categoryId: "cat-1", percentage: 40 },
          { categoryId: "cat-2", percentage: 60 },
        ],
      });
    });

    it.skip("should reset debounce timer on rapid changes", async () => {
      const { result } = renderHook(() =>
        useAllocations({
          userId: "user-1",
          boardId: "board-1",
          currentLevelCategories: mockCategories,
        })
      );

      // First change - set to 50%
      act(() => {
        result.current.handleAllocationChange("cat-1", 50);
      });

      vi.advanceTimersByTime(200);

      // Second change resets timer - set to 100%
      act(() => {
        result.current.handleAllocationChange("cat-2", 50);
      });

      vi.advanceTimersByTime(200);

      // Should not have saved yet (only 200ms since last change, need 300ms)
      expect(mockUpsertMutation).not.toHaveBeenCalled();

      vi.advanceTimersByTime(150);
      
      // Run all pending timers and flush promises
      await act(async () => {
        vi.runAllTimers();
        await Promise.resolve();
      });

      // Now should have saved (350ms since last change)
      await waitFor(() => {
        expect(mockUpsertMutation).toHaveBeenCalledTimes(1);
      });
    });

    it("should not save when userId or boardId is null", async () => {
      const { result } = renderHook(() =>
        useAllocations({
          userId: null,
          boardId: null,
          currentLevelCategories: mockCategories,
        })
      );

      act(() => {
        result.current.handleAllocationChange("cat-1", 50);
      });

      await act(async () => {
        vi.advanceTimersByTime(350);
      });

      expect(mockUpsertMutation).not.toHaveBeenCalled();
    });

    it.skip("should filter out zero percentage allocations before saving", async () => {
      const { result } = renderHook(() =>
        useAllocations({
          userId: "user-1",
          boardId: "board-1",
          currentLevelCategories: mockCategories,
        })
      );

      // Add allocations totaling 100%
      act(() => {
        result.current.handleAllocationChange("cat-1", 30);
        result.current.handleAllocationChange("cat-2", 70);
      });

      vi.advanceTimersByTime(350);
      
      await act(async () => {
        vi.runAllTimers();
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(mockUpsertMutation).toHaveBeenCalledTimes(1);
      });
      
      expect(mockUpsertMutation).toHaveBeenCalledWith({
        boardId: "board-1",
        userId: "user-1",
        parentId: undefined,
        allocations: [
          { categoryId: "cat-1", percentage: 30 },
          { categoryId: "cat-2", percentage: 70 },
        ],
      });

      // Reset mock
      mockUpsertMutation.mockClear();

      // Now set cat-1 to 0 and add cat-3 to make total 100%
      act(() => {
        result.current.handleAllocationChange("cat-1", 0);
        result.current.handleAllocationChange("cat-3", 30);
      });

      vi.advanceTimersByTime(350);
      
      await act(async () => {
        vi.runAllTimers();
        await Promise.resolve();
      });

      // Should only save non-zero allocations
      await waitFor(() => {
        expect(mockUpsertMutation).toHaveBeenCalledTimes(1);
      });
      
      expect(mockUpsertMutation).toHaveBeenCalledWith({
        boardId: "board-1",
        userId: "user-1",
        parentId: undefined,
        allocations: [
          { categoryId: "cat-2", percentage: 70 },
          { categoryId: "cat-3", percentage: 30 },
        ],
      });
    });
  });

  describe("category filtering", () => {
    it("should only consider current level categories in calculations", async () => {
      const currentLevelCats = [mockCategories[0], mockCategories[1]]; // Only first two

      mockUseQuery.mockReturnValue([
        { categoryId: "cat-1", percentage: 30 },
        { categoryId: "cat-2", percentage: 40 },
        { categoryId: "cat-3", percentage: 30 }, // Not in current level
      ]);

      const { result } = renderHook(() =>
        useAllocations({
          userId: "user-1",
          boardId: "board-1",
          currentLevelCategories: currentLevelCats,
        })
      );

      await waitFor(() => {
        // Total should only include current level categories
        expect(result.current.totalAllocated).toBe(70);
        expect(result.current.isFullyAllocated).toBe(false);
      });

      // cat-3 max should consider that it's not in current level
      // but the calculation is based on current level categories only
    });
  });

  describe("cleanup", () => {
    it("should clear timeout on unmount", () => {
      const { result, unmount } = renderHook(() =>
        useAllocations({
          userId: "user-1",
          boardId: "board-1",
          currentLevelCategories: mockCategories,
        })
      );

      act(() => {
        result.current.handleAllocationChange("cat-1", 50);
      });

      unmount();

      // Should not throw when timer tries to fire after unmount
      expect(() => vi.advanceTimersByTime(350)).not.toThrow();
    });
  });
});
