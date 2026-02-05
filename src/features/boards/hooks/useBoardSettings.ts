import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { BoardSettings } from "../../../types";

interface UseBoardSettingsProps {
  boardId: string | null;
  userId: string | null;
  isAdmin: boolean;
  defaultSettings: BoardSettings;
}

interface UseBoardSettingsReturn {
  settings: BoardSettings;
  updateSettings: (patch: Partial<BoardSettings>) => void;
  isDirty: boolean;
}

export function useBoardSettings({
  boardId,
  userId,
  isAdmin,
  defaultSettings,
}: UseBoardSettingsProps): UseBoardSettingsReturn {
  const [settings, setSettings] = useState<BoardSettings>(defaultSettings);
  const [pendingPatch, setPendingPatch] = useState<Partial<BoardSettings>>({});

  const updateBoardSettings = useMutation(api.boards.updateSettings);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastBoardIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!boardId) return;
    const boardKey = boardId.toString();
    if (lastBoardIdRef.current === boardKey) return;

    // Schedule state update to avoid setState-in-render warning
    const timeoutId = setTimeout(() => {
      lastBoardIdRef.current = boardKey;
      setSettings(defaultSettings);
      setPendingPatch({});
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [boardId, defaultSettings]);

  const updateSettings = useCallback(
    (patch: Partial<BoardSettings>) => {
      setSettings((prev) => ({ ...prev, ...patch }));
      setPendingPatch((prev) => ({ ...prev, ...patch }));
    },
    []
  );

  useEffect(() => {
    if (!boardId || !userId || !isAdmin) return;
    if (Object.keys(pendingPatch).length === 0) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const patchToSend = pendingPatch;
    timeoutRef.current = setTimeout(() => {
      setPendingPatch({});
      updateBoardSettings({
        boardId: boardId as Id<"boards">,
        userId: userId as Id<"users">,
        settings: patchToSend,
      });
    }, 300);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [pendingPatch, boardId, userId, isAdmin, updateBoardSettings]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    settings,
    updateSettings,
    isDirty: Object.keys(pendingPatch).length > 0,
  };
}

export type { UseBoardSettingsReturn };
