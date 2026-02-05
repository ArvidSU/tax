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
};

interface BoardEntry {
  board: {
    _id: string;
    name: string;
    description: string;
    settings?: BoardSettings;
  };
  role: "owner" | "participant" | "viewer";
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
  canCreateCategories: boolean;
  createBoard: (name: string, description: string) => Promise<string | null>;
  deleteBoard: () => Promise<void>;
  selectBoard: (boardId: string) => void;
  createError: string | null;
  clearCreateError: () => void;
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
  const removeBoardMutation = useMutation(api.boards.remove);

  const selectedBoardEntry = boards?.find(
    (entry: BoardEntry) => entry.board._id === selectedBoardId
  ) as BoardEntry | undefined;

  const isBoardAdmin = selectedBoardEntry?.role === "owner";
  const boardRole = selectedBoardEntry?.role ?? null;

  const settings = (board?.settings ?? {}) as Partial<BoardSettings>;
  const canCreateCategories =
    boardRole === "owner" ||
    (boardRole === "participant" &&
      (settings.participantsCanCreateCategories ??
        defaultBoardSettings.participantsCanCreateCategories));

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

  return {
    boards: boards as BoardEntry[] | undefined,
    board: board as BoardEntry["board"] | undefined,
    isLoading: boards === undefined,
    isBoardAdmin,
    boardRole,
    canCreateCategories,
    createBoard,
    deleteBoard,
    selectBoard,
    createError,
    clearCreateError,
  };
}

export type { BoardEntry };
export { defaultBoardSettings };
