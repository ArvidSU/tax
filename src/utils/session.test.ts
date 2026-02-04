import { describe, it, expect } from "vitest";
import {
  getStoredUserId,
  setStoredUserId,
  clearStoredUserId,
  getStoredBoardId,
  setStoredBoardId,
  clearStoredBoardId,
} from "./session";

describe("session storage helpers", () => {
  it("stores and retrieves user id", () => {
    setStoredUserId("user-123");
    expect(localStorage.setItem).toHaveBeenCalledWith(
      "allocation-boards-user-id",
      "user-123"
    );
    expect(getStoredUserId()).toBe("user-123");
  });

  it("clears user id", () => {
    clearStoredUserId();
    expect(localStorage.removeItem).toHaveBeenCalledWith(
      "allocation-boards-user-id"
    );
  });

  it("stores and retrieves board id", () => {
    setStoredBoardId("board-abc");
    expect(localStorage.setItem).toHaveBeenCalledWith(
      "allocation-boards-board-id",
      "board-abc"
    );
    expect(getStoredBoardId()).toBe("board-abc");
  });

  it("clears board id", () => {
    clearStoredBoardId();
    expect(localStorage.removeItem).toHaveBeenCalledWith(
      "allocation-boards-board-id"
    );
  });
});
