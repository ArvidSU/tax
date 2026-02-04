const userIdKey = "allocation-boards-user-id";
const boardIdKey = "allocation-boards-board-id";

export function getStoredUserId(): string | null {
  return localStorage.getItem(userIdKey);
}

export function setStoredUserId(userId: string): void {
  localStorage.setItem(userIdKey, userId);
}

export function clearStoredUserId(): void {
  localStorage.removeItem(userIdKey);
}

export function getStoredBoardId(): string | null {
  return localStorage.getItem(boardIdKey);
}

export function setStoredBoardId(boardId: string): void {
  localStorage.setItem(boardIdKey, boardId);
}

export function clearStoredBoardId(): void {
  localStorage.removeItem(boardIdKey);
}
