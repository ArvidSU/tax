import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSession } from "./useSession";

describe("useSession", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("should initialize with null values when localStorage is empty", () => {
    const { result } = renderHook(() => useSession());

    expect(result.current.userId).toBeNull();
    expect(result.current.boardId).toBeNull();
  });

  it("should initialize with stored values from localStorage", () => {
    localStorage.setItem("allocation-boards-user-id", "user-123");
    localStorage.setItem("allocation-boards-board-id", "board-456");

    const { result } = renderHook(() => useSession());

    expect(result.current.userId).toBe("user-123");
    expect(result.current.boardId).toBe("board-456");
  });

  it("should set userId and persist to localStorage", () => {
    const { result } = renderHook(() => useSession());

    act(() => {
      result.current.setUserId("user-789");
    });

    expect(result.current.userId).toBe("user-789");
    expect(localStorage.getItem("allocation-boards-user-id")).toBe("user-789");
  });

  it("should set boardId and persist to localStorage", () => {
    const { result } = renderHook(() => useSession());

    act(() => {
      result.current.setBoardId("board-abc");
    });

    expect(result.current.boardId).toBe("board-abc");
    expect(localStorage.getItem("allocation-boards-board-id")).toBe("board-abc");
  });

  it("should clear userId from state and localStorage when set to null", () => {
    const { result } = renderHook(() => useSession());

    act(() => {
      result.current.setUserId("user-123");
    });

    act(() => {
      result.current.setUserId(null);
    });

    expect(result.current.userId).toBeNull();
    expect(localStorage.getItem("allocation-boards-user-id")).toBeNull();
  });

  it("should clear boardId from state and localStorage when set to null", () => {
    const { result } = renderHook(() => useSession());

    act(() => {
      result.current.setBoardId("board-456");
    });

    act(() => {
      result.current.setBoardId(null);
    });

    expect(result.current.boardId).toBeNull();
    expect(localStorage.getItem("allocation-boards-board-id")).toBeNull();
  });

  it("should clear session and remove all items from localStorage", () => {
    const { result } = renderHook(() => useSession());

    act(() => {
      result.current.setUserId("user-123");
      result.current.setBoardId("board-456");
    });

    act(() => {
      result.current.clearSession();
    });

    expect(result.current.userId).toBeNull();
    expect(result.current.boardId).toBeNull();
    expect(localStorage.getItem("allocation-boards-user-id")).toBeNull();
    expect(localStorage.getItem("allocation-boards-board-id")).toBeNull();
  });

  it("should sync state when localStorage changes from another tab", () => {
    const { result } = renderHook(() => useSession());

    act(() => {
      result.current.setUserId("user-123");
    });

    // Simulate storage event from another tab
    act(() => {
      localStorage.setItem("allocation-boards-user-id", "user-new");
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "allocation-boards-user-id",
          newValue: "user-new",
        })
      );
    });

    expect(result.current.userId).toBe("user-new");
  });

  it("should sync boardId when localStorage changes from another tab", () => {
    const { result } = renderHook(() => useSession());

    act(() => {
      result.current.setBoardId("board-123");
    });

    act(() => {
      localStorage.setItem("allocation-boards-board-id", "board-new");
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "allocation-boards-board-id",
          newValue: "board-new",
        })
      );
    });

    expect(result.current.boardId).toBe("board-new");
  });

  it("should not update state for unrelated storage keys", () => {
    const { result } = renderHook(() => useSession());

    act(() => {
      result.current.setUserId("user-123");
    });

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "unrelated-key",
          newValue: "some-value",
        })
      );
    });

    expect(result.current.userId).toBe("user-123");
  });
});
