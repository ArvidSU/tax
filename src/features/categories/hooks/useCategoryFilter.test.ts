import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCategoryFilter } from "./useCategoryFilter";
import type { Category } from "../../../types";

const mockCategories: Category[] = [
  { _id: "cat-1", name: "Healthcare", description: "Health services", color: "#ff0000", order: 1 },
  { _id: "cat-2", name: "Education", description: "Schools", color: "#00ff00", order: 2 },
  { _id: "cat-3", name: "Defense", description: "Military", color: "#0000ff", order: 3 },
];

describe("useCategoryFilter", () => {
  it("should initialize with all categories available (empty filter)", () => {
    const { result } = renderHook(() => useCategoryFilter(mockCategories));

    expect(result.current.availableCategoryIds).toEqual([]);
  });

  it("should return true for isCategoryAvailable when filter is empty", () => {
    const { result } = renderHook(() => useCategoryFilter(mockCategories));

    expect(result.current.isCategoryAvailable("cat-1")).toBe(true);
    expect(result.current.isCategoryAvailable("cat-2")).toBe(true);
    expect(result.current.isCategoryAvailable("cat-3")).toBe(true);
  });

  it("should toggle category to unavailable when clicked first time", () => {
    const { result } = renderHook(() => useCategoryFilter(mockCategories));

    act(() => {
      result.current.toggleCategory("cat-1");
    });

    expect(result.current.availableCategoryIds).toContain("cat-2");
    expect(result.current.availableCategoryIds).toContain("cat-3");
    expect(result.current.availableCategoryIds).not.toContain("cat-1");
  });

  it("should add category back when toggled after initial filter", () => {
    const { result } = renderHook(() => useCategoryFilter(mockCategories));

    act(() => {
      result.current.toggleCategory("cat-1");
    });

    act(() => {
      result.current.toggleCategory("cat-1");
    });

    // After toggling twice, all categories are in the available list
    expect(result.current.availableCategoryIds).toEqual(["cat-2", "cat-3", "cat-1"]);
  });

  it("should allow toggling multiple categories", () => {
    const { result } = renderHook(() => useCategoryFilter(mockCategories));

    act(() => {
      result.current.toggleCategory("cat-1");
    });

    act(() => {
      result.current.toggleCategory("cat-2");
    });

    expect(result.current.availableCategoryIds).toEqual(["cat-3"]);
    expect(result.current.isCategoryAvailable("cat-3")).toBe(true);
    expect(result.current.isCategoryAvailable("cat-1")).toBe(false);
    expect(result.current.isCategoryAvailable("cat-2")).toBe(false);
  });

  it("should reset all categories to available when allowAllCategories is called", () => {
    const { result } = renderHook(() => useCategoryFilter(mockCategories));

    act(() => {
      result.current.toggleCategory("cat-1");
      result.current.toggleCategory("cat-2");
    });

    act(() => {
      result.current.allowAllCategories();
    });

    expect(result.current.availableCategoryIds).toEqual([]);
    expect(result.current.isCategoryAvailable("cat-1")).toBe(true);
    expect(result.current.isCategoryAvailable("cat-2")).toBe(true);
    expect(result.current.isCategoryAvailable("cat-3")).toBe(true);
  });

  it("should return false for isCategoryAvailable when category is filtered out", () => {
    const { result } = renderHook(() => useCategoryFilter(mockCategories));

    act(() => {
      result.current.toggleCategory("cat-1");
    });

    expect(result.current.isCategoryAvailable("cat-1")).toBe(false);
  });

  it("should handle empty categories array", () => {
    const { result } = renderHook(() => useCategoryFilter([]));

    expect(result.current.availableCategoryIds).toEqual([]);
    expect(result.current.isCategoryAvailable("any-id")).toBe(true);
  });

  it("should maintain state when categories prop changes", () => {
    const { result, rerender } = renderHook(
      ({ categories }) => useCategoryFilter(categories),
      { initialProps: { categories: mockCategories } }
    );

    act(() => {
      result.current.toggleCategory("cat-1");
    });

    const newCategories = [...mockCategories, { 
      _id: "cat-4", 
      name: "Transport", 
      description: "Transit", 
      color: "#ffff00", 
      order: 4 
    }];

    rerender({ categories: newCategories });

    // cat-1 should still be filtered out
    expect(result.current.availableCategoryIds).not.toContain("cat-1");
    // New category won't be in available list unless explicitly added
    expect(result.current.isCategoryAvailable("cat-4")).toBe(false);
    
    // Can add new category to available list
    act(() => {
      result.current.toggleCategory("cat-4");
    });
    expect(result.current.isCategoryAvailable("cat-4")).toBe(true);
  });
});
