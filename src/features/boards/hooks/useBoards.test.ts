import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useBoards, defaultBoardSettings } from "./useBoards";

// Mock Convex hooks
const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

vi.mock("../../../../convex/_generated/api", () => ({
  api: {
    boards: {
      listForUser: "listForUser",
      get: "get",
      getOwnerCount: "getOwnerCount",
      create: "create",
      leave: "leave",
      remove: "remove",
    },
  },
}));

// Mock window.confirm
const mockConfirm = vi.fn();
Object.defineProperty(window, "confirm", {
  value: mockConfirm,
  writable: true,
});

const createMockBoards = () => [
  {
    board: {
      _id: "board-1",
      name: "Personal Budget",
      description: "My personal budget allocation",
      settings: defaultBoardSettings,
    },
    role: "owner" as const,
  },
  {
    board: {
      _id: "board-2",
      name: "Team Budget",
      description: "Team budget planning",
      settings: {
        ...defaultBoardSettings,
        participantsCanCreateCategories: false,
      },
    },
    role: "participant" as const,
  },
  {
    board: {
      _id: "board-3",
      name: "View Only Board",
      description: "Read-only access",
      settings: defaultBoardSettings,
    },
    role: "viewer" as const,
  },
];

describe("useBoards", () => {
  let mockCreateMutation: ReturnType<typeof vi.fn>;
  let mockLeaveMutation: ReturnType<typeof vi.fn>;
  let mockRemoveMutation: ReturnType<typeof vi.fn>;
  const mockOnBoardSelect = vi.fn();

  beforeEach(() => {
    mockCreateMutation = vi.fn().mockResolvedValue("new-board-id");
    mockLeaveMutation = vi.fn().mockResolvedValue(undefined);
    mockRemoveMutation = vi.fn().mockResolvedValue(undefined);
    // Return different mocks based on which mutation is being requested
    mockUseMutation.mockImplementation((mutationRef: unknown) => {
      if (mutationRef === "create") return mockCreateMutation;
      if (mutationRef === "leave") return mockLeaveMutation;
      if (mutationRef === "remove") return mockRemoveMutation;
      return vi.fn();
    });
    mockUseQuery.mockReturnValue(undefined);
    mockConfirm.mockReturnValue(true);
    mockOnBoardSelect.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("should skip queries when userId is null", () => {
      renderHook(() =>
        useBoards({
          userId: null,
          selectedBoardId: null,
          onBoardSelect: mockOnBoardSelect,
        })
      );

      expect(mockUseQuery).toHaveBeenCalledWith("listForUser", "skip");
    });

    it("should fetch boards when userId is provided", () => {
      mockUseQuery.mockReturnValue([]);

      renderHook(() =>
        useBoards({
          userId: "user-1",
          selectedBoardId: null,
          onBoardSelect: mockOnBoardSelect,
        })
      );

      expect(mockUseQuery).toHaveBeenCalledWith("listForUser", {
        userId: "user-1",
      });
    });

    it("should skip board fetch when no board is selected", () => {
      mockUseQuery.mockReturnValue([]);

      renderHook(() =>
        useBoards({
          userId: "user-1",
          selectedBoardId: null,
          onBoardSelect: mockOnBoardSelect,
        })
      );

      // Second query call should be for get board, which should be skipped
      const calls = mockUseQuery.mock.calls;
      const getBoardCall = calls.find((call) => call[0] === "get");
      expect(getBoardCall).toEqual(["get", "skip"]);
    });
  });

  describe("loading state", () => {
    it("should be loading when boards data is undefined", () => {
      mockUseQuery.mockReturnValue(undefined);

      const { result } = renderHook(() =>
        useBoards({
          userId: "user-1",
          selectedBoardId: null,
          onBoardSelect: mockOnBoardSelect,
        })
      );

      expect(result.current.isLoading).toBe(true);
    });

    it("should not be loading when boards data is available", () => {
      mockUseQuery.mockReturnValue([]);

      const { result } = renderHook(() =>
        useBoards({
          userId: "user-1",
          selectedBoardId: null,
          onBoardSelect: mockOnBoardSelect,
        })
      );

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("board selection", () => {
    it("should auto-select first board when none selected and boards available", async () => {
      const mockBoards = createMockBoards();
      mockUseQuery.mockReturnValue(mockBoards);

      renderHook(() =>
        useBoards({
          userId: "user-1",
          selectedBoardId: null,
          onBoardSelect: mockOnBoardSelect,
        })
      );

      await waitFor(() => {
        expect(mockOnBoardSelect).toHaveBeenCalledWith("board-1");
      });
    });

    it("should not auto-select when a board is already selected", () => {
      const mockBoards = createMockBoards();
      mockUseQuery.mockReturnValue(mockBoards);

      renderHook(() =>
        useBoards({
          userId: "user-1",
          selectedBoardId: "board-2",
          onBoardSelect: mockOnBoardSelect,
        })
      );

      expect(mockOnBoardSelect).not.toHaveBeenCalled();
    });

    it("should allow manual board selection", () => {
      mockUseQuery.mockReturnValue([]);

      const { result } = renderHook(() =>
        useBoards({
          userId: "user-1",
          selectedBoardId: null,
          onBoardSelect: mockOnBoardSelect,
        })
      );

      act(() => {
        result.current.selectBoard("board-123");
      });

      expect(mockOnBoardSelect).toHaveBeenCalledWith("board-123");
    });
  });

  describe("role-based permissions", () => {
    it("should identify owner as admin", () => {
      const mockBoards = createMockBoards();
      mockUseQuery.mockReturnValue(mockBoards);

      const { result } = renderHook(() =>
        useBoards({
          userId: "user-1",
          selectedBoardId: "board-1",
          onBoardSelect: mockOnBoardSelect,
        })
      );

      expect(result.current.isBoardAdmin).toBe(true);
      expect(result.current.boardRole).toBe("owner");
    });

    it("should identify participant as non-admin", () => {
      const mockBoards = createMockBoards();
      mockUseQuery.mockReturnValue(mockBoards);

      const { result } = renderHook(() =>
        useBoards({
          userId: "user-1",
          selectedBoardId: "board-2",
          onBoardSelect: mockOnBoardSelect,
        })
      );

      expect(result.current.isBoardAdmin).toBe(false);
      expect(result.current.boardRole).toBe("participant");
    });

    it("should identify viewer as non-admin", () => {
      const mockBoards = createMockBoards();
      mockUseQuery.mockReturnValue(mockBoards);

      const { result } = renderHook(() =>
        useBoards({
          userId: "user-1",
          selectedBoardId: "board-3",
          onBoardSelect: mockOnBoardSelect,
        })
      );

      expect(result.current.isBoardAdmin).toBe(false);
      expect(result.current.boardRole).toBe("viewer");
    });

    it("should allow owner to create categories", () => {
      const mockBoards = createMockBoards();
      mockUseQuery.mockReturnValue(mockBoards);

      const { result } = renderHook(() =>
        useBoards({
          userId: "user-1",
          selectedBoardId: "board-1",
          onBoardSelect: mockOnBoardSelect,
        })
      );

      expect(result.current.canCreateCategories).toBe(true);
    });

    it("should respect participantsCanCreateCategories setting for participants", () => {
      const mockBoards = createMockBoards();
      // Return different values for list vs get queries
      mockUseQuery
        .mockReturnValueOnce(mockBoards) // for listForUser
        .mockReturnValueOnce({
          _id: "board-2",
          name: "Team Budget",
          description: "Team budget planning",
          settings: {
            ...defaultBoardSettings,
            participantsCanCreateCategories: false,
          },
        }); // for get

      // board-2 has participantsCanCreateCategories: false
      const { result: resultBoard2 } = renderHook(() =>
        useBoards({
          userId: "user-1",
          selectedBoardId: "board-2",
          onBoardSelect: mockOnBoardSelect,
        })
      );

      expect(resultBoard2.current.canCreateCategories).toBe(false);
    });

    it("should allow participants to create when setting is true", () => {
      const mockBoards = [
        {
          board: {
            _id: "board-4",
            name: "Open Board",
            description: "Open",
            settings: {
              ...defaultBoardSettings,
              participantsCanCreateCategories: true,
            },
          },
          role: "participant" as const,
        },
      ];
      mockUseQuery
        .mockReturnValueOnce(mockBoards)
        .mockReturnValueOnce({
          _id: "board-4",
          name: "Open Board",
          description: "Open",
          settings: {
            ...defaultBoardSettings,
            participantsCanCreateCategories: true,
          },
        });

      const { result } = renderHook(() =>
        useBoards({
          userId: "user-1",
          selectedBoardId: "board-4",
          onBoardSelect: mockOnBoardSelect,
        })
      );

      expect(result.current.canCreateCategories).toBe(true);
    });

    it("should not allow viewers to create categories", () => {
      const mockBoards = createMockBoards();
      mockUseQuery.mockReturnValue(mockBoards);

      const { result } = renderHook(() =>
        useBoards({
          userId: "user-1",
          selectedBoardId: "board-3",
          onBoardSelect: mockOnBoardSelect,
        })
      );

      expect(result.current.canCreateCategories).toBe(false);
    });

    it("should disable leave board when owner count is 1", () => {
      const mockBoards = createMockBoards();
      mockUseQuery
        .mockReturnValueOnce(mockBoards)
        .mockReturnValueOnce(mockBoards[0].board)
        .mockReturnValueOnce(1);

      const { result } = renderHook(() =>
        useBoards({
          userId: "user-1",
          selectedBoardId: "board-1",
          onBoardSelect: mockOnBoardSelect,
        })
      );

      expect(result.current.isLeaveBoardDisabled).toBe(true);
      expect(result.current.leaveBoardDisabledReason).toContain(
        "Add another owner"
      );
    });

    it("should allow leave board when owner count is greater than 1", () => {
      const mockBoards = createMockBoards();
      mockUseQuery
        .mockReturnValueOnce(mockBoards)
        .mockReturnValueOnce(mockBoards[0].board)
        .mockReturnValueOnce(2);

      const { result } = renderHook(() =>
        useBoards({
          userId: "user-1",
          selectedBoardId: "board-1",
          onBoardSelect: mockOnBoardSelect,
        })
      );

      expect(result.current.isLeaveBoardDisabled).toBe(false);
      expect(result.current.leaveBoardDisabledReason).toBeNull();
    });

    it("should not disable leave board for non-owners", () => {
      const mockBoards = createMockBoards();
      mockUseQuery
        .mockReturnValueOnce(mockBoards)
        .mockReturnValueOnce(mockBoards[1].board)
        .mockReturnValueOnce(1);

      const { result } = renderHook(() =>
        useBoards({
          userId: "user-1",
          selectedBoardId: "board-2",
          onBoardSelect: mockOnBoardSelect,
        })
      );

      expect(result.current.isLeaveBoardDisabled).toBe(false);
      expect(result.current.leaveBoardDisabledReason).toBeNull();
    });
  });

  describe("createBoard", () => {
    it("should create a board successfully", async () => {
      mockUseQuery.mockReturnValue([]);

      const { result } = renderHook(() =>
        useBoards({
          userId: "user-1",
          selectedBoardId: null,
          onBoardSelect: mockOnBoardSelect,
        })
      );

      const boardId = await result.current.createBoard(
        "New Board",
        "A new board"
      );

      expect(mockCreateMutation).toHaveBeenCalledWith({
        name: "New Board",
        description: "A new board",
        ownerId: "user-1",
        public: false,
        settings: defaultBoardSettings,
      });
      expect(boardId).toBe("new-board-id");
      expect(mockOnBoardSelect).toHaveBeenCalledWith("new-board-id");
    });

    it("should trim name and description", async () => {
      mockUseQuery.mockReturnValue([]);

      const { result } = renderHook(() =>
        useBoards({
          userId: "user-1",
          selectedBoardId: null,
          onBoardSelect: mockOnBoardSelect,
        })
      );

      await result.current.createBoard("  New Board  ", "  Description  ");

      expect(mockCreateMutation).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "New Board",
          description: "Description",
        })
      );
    });

    it("should reject empty board name", async () => {
      mockUseQuery.mockReturnValue([]);

      const { result } = renderHook(() =>
        useBoards({
          userId: "user-1",
          selectedBoardId: null,
          onBoardSelect: mockOnBoardSelect,
        })
      );

      let boardId: string | null = null;
      await act(async () => {
        boardId = await result.current.createBoard("", "Description");
      });

      expect(boardId).toBeNull();
      expect(mockCreateMutation).not.toHaveBeenCalled();
      expect(result.current.createError).toBe("Board name is required");
    });

    it("should reject whitespace-only board name", async () => {
      mockUseQuery.mockReturnValue([]);

      const { result } = renderHook(() =>
        useBoards({
          userId: "user-1",
          selectedBoardId: null,
          onBoardSelect: mockOnBoardSelect,
        })
      );

      let boardId: string | null = null;
      await act(async () => {
        boardId = await result.current.createBoard("   ", "Description");
      });

      expect(boardId).toBeNull();
      expect(result.current.createError).toBe("Board name is required");
    });

    it("should not create board when userId is null", async () => {
      mockUseQuery.mockReturnValue([]);

      const { result } = renderHook(() =>
        useBoards({
          userId: null,
          selectedBoardId: null,
          onBoardSelect: mockOnBoardSelect,
        })
      );

      const boardId = await result.current.createBoard("Name", "Desc");

      expect(boardId).toBeNull();
      expect(mockCreateMutation).not.toHaveBeenCalled();
    });

    it("should handle creation errors", async () => {
      mockCreateMutation.mockRejectedValue(new Error("Database error"));
      mockUseQuery.mockReturnValue([]);

      const { result } = renderHook(() =>
        useBoards({
          userId: "user-1",
          selectedBoardId: null,
          onBoardSelect: mockOnBoardSelect,
        })
      );

      let boardId: string | null = null;
      await act(async () => {
        boardId = await result.current.createBoard("Name", "Desc");
      });

      expect(boardId).toBeNull();
      expect(result.current.createError).toBe("Database error");
    });

    it("should clear previous errors before creating", async () => {
      mockUseQuery.mockReturnValue([]);

      const { result } = renderHook(() =>
        useBoards({
          userId: "user-1",
          selectedBoardId: null,
          onBoardSelect: mockOnBoardSelect,
        })
      );

      // First attempt fails
      await act(async () => {
        await result.current.createBoard("", "Description");
      });
      expect(result.current.createError).toBe("Board name is required");

      // Second attempt should clear error
      await act(async () => {
        await result.current.createBoard("Valid Name", "Description");
      });
      expect(result.current.createError).toBeNull();
    });
  });

  describe("deleteBoard", () => {
    it("should delete board after confirmation", async () => {
      mockUseQuery.mockReturnValue([]);
      mockConfirm.mockReturnValue(true);

      const { result } = renderHook(() =>
        useBoards({
          userId: "user-1",
          selectedBoardId: "board-1",
          onBoardSelect: mockOnBoardSelect,
        })
      );

      await result.current.deleteBoard();

      expect(mockConfirm).toHaveBeenCalledWith(
        "Delete this board and all related allocations?"
      );
      expect(mockRemoveMutation).toHaveBeenCalledWith({
        boardId: "board-1",
        userId: "user-1",
      });
      expect(mockOnBoardSelect).toHaveBeenCalledWith(null);
    });

    it("should not delete when user cancels confirmation", async () => {
      mockUseQuery.mockReturnValue([]);
      mockConfirm.mockReturnValue(false);

      const { result } = renderHook(() =>
        useBoards({
          userId: "user-1",
          selectedBoardId: "board-1",
          onBoardSelect: mockOnBoardSelect,
        })
      );

      await result.current.deleteBoard();

      expect(mockConfirm).toHaveBeenCalled();
      expect(mockRemoveMutation).not.toHaveBeenCalled();
      expect(mockOnBoardSelect).not.toHaveBeenCalled();
    });

    it("should not delete when no board is selected", async () => {
      mockUseQuery.mockReturnValue([]);

      const { result } = renderHook(() =>
        useBoards({
          userId: "user-1",
          selectedBoardId: null,
          onBoardSelect: mockOnBoardSelect,
        })
      );

      await result.current.deleteBoard();

      expect(mockConfirm).not.toHaveBeenCalled();
      expect(mockRemoveMutation).not.toHaveBeenCalled();
    });

    it("should not delete when userId is null", async () => {
      mockUseQuery.mockReturnValue([]);

      const { result } = renderHook(() =>
        useBoards({
          userId: null,
          selectedBoardId: "board-1",
          onBoardSelect: mockOnBoardSelect,
        })
      );

      await result.current.deleteBoard();

      expect(mockRemoveMutation).not.toHaveBeenCalled();
    });
  });

  describe("leaveBoard", () => {
    it("should leave board after confirmation", async () => {
      const mockBoards = createMockBoards();
      mockUseQuery
        .mockReturnValueOnce(mockBoards)
        .mockReturnValueOnce(mockBoards[0].board)
        .mockReturnValueOnce(2);
      mockConfirm.mockReturnValue(true);

      const { result } = renderHook(() =>
        useBoards({
          userId: "user-1",
          selectedBoardId: "board-1",
          onBoardSelect: mockOnBoardSelect,
        })
      );

      await result.current.leaveBoard();

      expect(mockLeaveMutation).toHaveBeenCalledWith({
        boardId: "board-1",
        userId: "user-1",
      });
      expect(mockOnBoardSelect).toHaveBeenCalledWith(null);
    });

    it("should not leave when disabled", async () => {
      const mockBoards = createMockBoards();
      mockUseQuery
        .mockReturnValueOnce(mockBoards)
        .mockReturnValueOnce(mockBoards[0].board)
        .mockReturnValueOnce(1);
      mockConfirm.mockReturnValue(true);

      const { result } = renderHook(() =>
        useBoards({
          userId: "user-1",
          selectedBoardId: "board-1",
          onBoardSelect: mockOnBoardSelect,
        })
      );

      await result.current.leaveBoard();

      expect(mockConfirm).not.toHaveBeenCalled();
      expect(mockLeaveMutation).not.toHaveBeenCalled();
    });
  });

  describe("clearCreateError", () => {
    it("should clear create error", async () => {
      mockUseQuery.mockReturnValue([]);

      const { result } = renderHook(() =>
        useBoards({
          userId: "user-1",
          selectedBoardId: null,
          onBoardSelect: mockOnBoardSelect,
        })
      );

      // Create an error
      await act(async () => {
        await result.current.createBoard("", "Description");
      });
      expect(result.current.createError).toBe("Board name is required");

      // Clear it
      act(() => {
        result.current.clearCreateError();
      });

      expect(result.current.createError).toBeNull();
    });
  });

  describe("selected board data", () => {
    it("should return selected board details", () => {
      const mockBoards = createMockBoards();
      mockUseQuery
        .mockReturnValueOnce(mockBoards)
        .mockReturnValueOnce(mockBoards[0].board);

      const { result } = renderHook(() =>
        useBoards({
          userId: "user-1",
          selectedBoardId: "board-1",
          onBoardSelect: mockOnBoardSelect,
        })
      );

      expect(result.current.board).toEqual(mockBoards[0].board);
    });

    it("should return undefined when no board selected", () => {
      // First call returns boards list, second call (get) should return undefined since it's skipped
      mockUseQuery
        .mockReturnValueOnce(createMockBoards())
        .mockReturnValueOnce(undefined);

      const { result } = renderHook(() =>
        useBoards({
          userId: "user-1",
          selectedBoardId: null,
          onBoardSelect: mockOnBoardSelect,
        })
      );

      // board should be undefined when no board is selected
      // When selectedBoardId is null, the get query is skipped, so board is undefined
      expect(result.current.board).toBeUndefined();
    });
  });
});
