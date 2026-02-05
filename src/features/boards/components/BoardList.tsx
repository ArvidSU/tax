
import { Button } from "../../../components/ui/Button";
import { Input, TextArea } from "../../../components/ui/Input";
import { Card, CardContent, CardTitle } from "../../../components/ui/Card";
import type { BoardEntry } from "../hooks/useBoards";
import "./BoardList.css";

interface BoardListProps {
  boards: BoardEntry[] | undefined;
  selectedBoardId: string | null;
  onSelectBoard: (boardId: string) => void;
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
  name,
  description,
  error,
  onNameChange,
  onDescriptionChange,
  onCreate,
}: BoardListProps) {
  return (
    <section className="board-panel">
      <div className="board-list">
        <h2>Your boards</h2>
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

      <Card variant="bordered" className="board-create">
        <CardContent>
          <CardTitle>Create a board</CardTitle>
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
          <Button variant="primary" onClick={onCreate}>
            Create board
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
