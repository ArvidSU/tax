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
  const [isSaving, setIsSaving] = useState(false);

  const updateBoardSettings = useMutation(api.boards.updateSettings);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // When switching boards, reset local form state.
    setSettings(defaultSettings);
    setPendingPatch({});
  }, [boardId]);

  useEffect(() => {
    // Sync with server-provided settings after refresh/loading, but do not
    // overwrite local edits that are pending debounce save.
    if (Object.keys(pendingPatch).length > 0 || isSaving) return;
    setSettings(defaultSettings);
  }, [defaultSettings, pendingPatch, isSaving]);

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
    if (isSaving) return;
    if (
      settings.maxAllocation > 0 &&
      settings.minAllocation > settings.maxAllocation
    ) {
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const patchToSend = pendingPatch;
    timeoutRef.current = setTimeout(() => {
      setIsSaving(true);
      void updateBoardSettings({
        boardId: boardId as Id<"boards">,
        userId: userId as Id<"users">,
        settings: patchToSend,
      })
        .then(() => {
          setPendingPatch((current) => {
            const next = { ...current };
            for (const [key, value] of Object.entries(patchToSend)) {
              const typedKey = key as keyof BoardSettings;
              if (next[typedKey] === value) {
                delete next[typedKey];
              }
            }
            return next;
          });
        })
        .finally(() => {
          setIsSaving(false);
        });
    }, 300);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [pendingPatch, boardId, userId, isAdmin, settings, isSaving, updateBoardSettings]);

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
    isDirty: Object.keys(pendingPatch).length > 0 || isSaving,
  };
}

export type { UseBoardSettingsReturn };
