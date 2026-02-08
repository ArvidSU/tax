import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { BoardSettings } from "../../../types";

const defaultBoardSettings: BoardSettings = {
  participantsCanCreateCategories: true,
  undistributedStrategy: "average",
  unit: "USD",
  symbol: "$",
  symbolPosition: "prefix",
  minAllocation: 0,
  maxAllocation: 0,
};

interface BoardEntry {
  board: {
    _id: string;
    name: string;
    description: string;
    public: boolean;
    settings?: BoardSettings;
  };
  role: "owner" | "participant" | "viewer";
  userPrefs: {
    allocationTotal: number;
  };
}

interface UseBoardsProps {
  userId: string | null;
  selectedBoardId: string | null;
  onBoardSelect: (boardId: string | null) => void;
}

interface UseBoardsReturn {
  boards: BoardEntry[] | undefined;
  board: BoardEntry["board"] | undefined;
  isLoading: boolean;
  isBoardAdmin: boolean;
  boardRole: "owner" | "participant" | "viewer" | null;
  allocationTotal: number;
  ownerCount: number | undefined;
  isLeaveBoardDisabled: boolean;
  leaveBoardDisabledReason: string | null;
  canCreateCategories: boolean;
  createBoard: (name: string, description: string) => Promise<string | null>;
  leaveBoard: () => Promise<void>;
  deleteBoard: () => Promise<void>;
  selectBoard: (boardId: string) => void;
  createError: string | null;
  leaveError: string | null;
  clearCreateError: () => void;
  clearLeaveError: () => void;
}

export function useBoards({
  userId,
  selectedBoardId,
  onBoardSelect,
}: UseBoardsProps): UseBoardsReturn {
  const [createError, setCreateError] = useState<string | null>(null);

  const boards = useQuery(
    api.boards.listForUser,
    userId ? { userId: userId as Id<"users"> } : "skip"
  );

  const board = useQuery(
    api.boards.get,
    selectedBoardId ? { boardId: selectedBoardId as Id<"boards"> } : "skip"
  );

  const createBoardMutation = useMutation(api.boards.create);
  const leaveBoardMutation = useMutation(api.boards.leave);
  const removeBoardMutation = useMutation(api.boards.remove);
  const ownerCount = useQuery(
    api.boards.getOwnerCount,
    selectedBoardId ? { boardId: selectedBoardId as Id<"boards"> } : "skip"
  );

  const selectedBoardEntry = boards?.find(
    (entry: BoardEntry) => entry.board._id === selectedBoardId
  ) as BoardEntry | undefined;

  const isBoardAdmin = selectedBoardEntry?.role === "owner";
  const boardRole = selectedBoardEntry?.role ?? null;
  const allocationTotal = selectedBoardEntry?.userPrefs?.allocationTotal ?? 100;

  const settings = (board?.settings ?? {}) as Partial<BoardSettings>;
  const canCreateCategories =
    boardRole === "owner" ||
    (boardRole === "participant" &&
      (settings.participantsCanCreateCategories ??
        defaultBoardSettings.participantsCanCreateCategories));
  const isOwner = boardRole === "owner";
  const isLeaveBoardDisabled = isOwner && (ownerCount === undefined || ownerCount <= 1);
  const leaveBoardDisabledReason = isLeaveBoardDisabled
    ? "Add another owner before leaving this board."
    : null;

  useEffect(() => {
    if (boards && boards.length > 0 && !selectedBoardId) {
      const firstBoardId = boards[0].board._id as string;
      onBoardSelect(firstBoardId);
    }
  }, [boards, selectedBoardId, onBoardSelect]);

  const createBoard = useCallback(
    async (name: string, description: string): Promise<string | null> => {
      if (!userId) return null;
      setCreateError(null);

      if (!name.trim()) {
        setCreateError("Board name is required");
        return null;
      }

      try {
        const newBoardId = await createBoardMutation({
          name: name.trim(),
          description: description.trim(),
          ownerId: userId as Id<"users">,
          public: false,
          settings: defaultBoardSettings,
        });
        const idString = newBoardId as string;
        onBoardSelect(idString);
        return idString;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to create board";
        setCreateError(message);
        return null;
      }
    },
    [userId, createBoardMutation, onBoardSelect]
  );

  const [leaveError, setLeaveError] = useState<string | null>(null);

  const leaveBoard = useCallback(async (): Promise<void> => {
    if (!selectedBoardId || !userId) return;
    if (isLeaveBoardDisabled) return;

    const confirmed = window.confirm("Leave this board?");
    if (!confirmed) return;

    setLeaveError(null);

    try {
      await leaveBoardMutation({
        boardId: selectedBoardId as Id<"boards">,
        userId: userId as Id<"users">,
      });
      onBoardSelect(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to leave board";
      setLeaveError(message);
    }
  }, [
    selectedBoardId,
    userId,
    isLeaveBoardDisabled,
    leaveBoardMutation,
    onBoardSelect,
  ]);

  const deleteBoard = useCallback(async (): Promise<void> => {
    if (!selectedBoardId || !userId) return;

    const confirmed = window.confirm(
      "Delete this board and all related allocations?"
    );
    if (!confirmed) return;

    await removeBoardMutation({
      boardId: selectedBoardId as Id<"boards">,
      userId: userId as Id<"users">,
    });

    onBoardSelect(null);
  }, [selectedBoardId, userId, removeBoardMutation, onBoardSelect]);

  const selectBoard = useCallback(
    (boardId: string) => {
      onBoardSelect(boardId);
    },
    [onBoardSelect]
  );

  const clearCreateError = useCallback(() => setCreateError(null), []);
  const clearLeaveError = useCallback(() => setLeaveError(null), []);

  return {
    boards: boards as BoardEntry[] | undefined,
    board: board as BoardEntry["board"] | undefined,
    isLoading: boards === undefined,
    isBoardAdmin,
    boardRole,
    allocationTotal,
    ownerCount: ownerCount as number | undefined,
    isLeaveBoardDisabled,
    leaveBoardDisabledReason,
    canCreateCategories,
    createBoard,
    leaveBoard,
    deleteBoard,
    selectBoard,
    createError,
    leaveError,
    clearCreateError,
    clearLeaveError,
  };
}

export type { BoardEntry };
export { defaultBoardSettings };
