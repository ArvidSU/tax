import { useState, useCallback, useEffect } from "react";
import {
  getStoredUserId,
  setStoredUserId as setStorageUserId,
  clearStoredUserId as clearStorageUserId,
  getStoredBoardId,
  setStoredBoardId as setStorageBoardId,
  clearStoredBoardId as clearStorageBoardId,
} from "../utils/session";

interface UseSessionReturn {
  userId: string | null;
  boardId: string | null;
  setUserId: (id: string | null) => void;
  setBoardId: (id: string | null) => void;
  clearSession: () => void;
}

export function useSession(): UseSessionReturn {
  const [userId, setUserIdState] = useState<string | null>(getStoredUserId());
  const [boardId, setBoardIdState] = useState<string | null>(getStoredBoardId());

  const setUserId = useCallback((id: string | null) => {
    if (id) {
      setStorageUserId(id);
    } else {
      clearStorageUserId();
    }
    setUserIdState(id);
  }, []);

  const setBoardId = useCallback((id: string | null) => {
    if (id) {
      setStorageBoardId(id);
    } else {
      clearStorageBoardId();
    }
    setBoardIdState(id);
  }, []);

  const clearSession = useCallback(() => {
    clearStorageUserId();
    clearStorageBoardId();
    setUserIdState(null);
    setBoardIdState(null);
  }, []);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "allocation-boards-user-id") {
        setUserIdState(getStoredUserId());
      } else if (e.key === "allocation-boards-board-id") {
        setBoardIdState(getStoredBoardId());
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return {
    userId,
    boardId,
    setUserId,
    setBoardId,
    clearSession,
  };
}
