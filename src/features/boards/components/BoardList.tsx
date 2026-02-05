
import { useMemo, useState } from "react";
import { Button } from "../../../components/ui/Button";
import { Input, TextArea } from "../../../components/ui/Input";
import type { BoardEntry } from "../hooks/useBoards";
import "./BoardList.css";

interface BoardListProps {
  boards: BoardEntry[] | undefined;
  selectedBoardId: string | null;
  onSelectBoard: (boardId: string) => void;
  showCreateForm: boolean;
  onToggleCreateForm: () => void;
  name: string;
  description: string;
  error: string | null;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onCreate: () => void;
}

export function BoardList({
  boards,
  selectedBoardId,
  onSelectBoard,
  showCreateForm,
  onToggleCreateForm,
  name,
  description,
  error,
  onNameChange,
  onDescriptionChange,
  onCreate,
}: BoardListProps) {
  const [showAllBoards, setShowAllBoards] = useState(false);

  const ownedBoard = useMemo(
    () => boards?.find((entry) => entry.role === "owner"),
    [boards]
  );
  const invitedBoard = useMemo(
    () => boards?.find((entry) => entry.role !== "owner"),
    [boards]
  );

  return (
    <section className="board-panel" aria-label="Board actions">
      <div className="board-action-strip">
        <button
          className={`board-action-tile ${
            selectedBoardId === ownedBoard?.board._id ? "active" : ""
          }`}
          onClick={() => ownedBoard && onSelectBoard(ownedBoard.board._id)}
          disabled={!ownedBoard}
        >
          <span className="board-action-title">
            {ownedBoard?.board.name ?? "No owned board yet"}
          </span>
          <span className="board-action-caption">
            {ownedBoard ? "Owned board" : "Create your first board"}
          </span>
        </button>

        <button
          className={`board-action-tile ${
            selectedBoardId === invitedBoard?.board._id ? "active" : ""
          }`}
          onClick={() => invitedBoard && onSelectBoard(invitedBoard.board._id)}
          disabled={!invitedBoard}
        >
          <span className="board-action-title">
            {invitedBoard?.board.name ?? "No invited boards yet"}
          </span>
          <span className="board-action-caption">
            {invitedBoard ? "Invited board" : "Accept an invite to join"}
          </span>
        </button>

        <button
          className={`board-action-tile board-action-expand board-action-utility ${
            showAllBoards ? "active" : ""
          }`}
          onClick={() => setShowAllBoards((prev) => !prev)}
        >
          <span className="board-action-title">
            {showAllBoards ? "Hide Boards" : "Show Other Boards"}
          </span>
          <span className="board-action-caption">
            {boards?.length ?? 0} total boards
          </span>
        </button>
      </div>

      {showCreateForm && (
        <div className="board-create">
          <h3>Create board</h3>
          <Input
            label="Board name"
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
          />
          <TextArea
            label="Description"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            rows={3}
          />
          {error && <div className="auth-error">{error}</div>}
          <div className="board-create-actions">
            <Button variant="primary" onClick={onCreate} size="sm">
              Create board
            </Button>
            <Button variant="ghost" onClick={onToggleCreateForm} size="sm">
              Close
            </Button>
          </div>
        </div>
      )}

      {showAllBoards && (
        <div className="board-list">
          <h3>All boards</h3>
          {boards && boards.length > 0 ? (
            <div className="board-list-grid">
              {boards.map((entry) => {
                const { board, role } = entry;
                return (
                  <button
                    key={board._id}
                    className={`board-card ${
                      selectedBoardId === board._id ? "active" : ""
                    }`}
                    onClick={() => onSelectBoard(board._id)}
                  >
                    <div className="board-card-title">{board.name}</div>
                    <div className="board-card-meta">{role}</div>
                    <div className="board-card-desc">
                      {board.description || "No description"}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="board-empty">No boards yet.</div>
          )}
        </div>
      )}
    </section>
  );
}
