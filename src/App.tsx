import { useState, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { Loading } from "./components/ui/Loading";
import { useSession } from "./hooks/useSession";
import { useAuth } from "./features/auth/hooks/useAuth";
import { AuthCard } from "./features/auth/components/AuthCard";
import { useBoards } from "./features/boards/hooks/useBoards";
import { BoardList } from "./features/boards/components/BoardList";
import { useBoardSettings } from "./features/boards/hooks/useBoardSettings";
import { useCategories } from "./features/categories/hooks/useCategories";
import { useCategoryFilter } from "./features/categories/hooks/useCategoryFilter";
import { useAllocations } from "./features/allocations/hooks/useAllocations";
import { useInvites } from "./features/invites/hooks/useInvites";
import { Body } from "./components/Body";
import "./App.css";

const defaultBoardSettings = {
  participantsCanCreateCategories: true,
  undistributedStrategy: "average" as const,
  unit: "USD",
  symbol: "$",
};

function App() {
  const { userId, boardId, setUserId, setBoardId, clearSession } = useSession();
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);

  const auth = useAuth();
  const user = useQuery(
    api.users.get,
    userId ? { userId: userId as Id<"users"> } : "skip"
  );

  const handleBoardSelect = useCallback(
    (id: string | null) => {
      setBoardId(id);
      setCurrentParentId(null);
    },
    [setBoardId]
  );

  const boards = useBoards({
    userId,
    selectedBoardId: boardId,
    onBoardSelect: handleBoardSelect,
  });

  const boardSettings = useBoardSettings({
    boardId,
    userId,
    isAdmin: boards.isBoardAdmin,
    defaultSettings: defaultBoardSettings,
  });

  const categories = useCategories({
    selectedBoardId: boardId,
    userId,
    canCreateCategories: boards.canCreateCategories,
    availableCategoryIds: [],
  });

  const categoryFilter = useCategoryFilter(categories.rootCategories);

  const currentLevelCategories = categories.currentLevelCategories(currentParentId);

  const allocations = useAllocations({
    userId,
    boardId,
    currentLevelCategories,
  });

  const invites = useInvites({
    userId,
    boardId,
    userEmail: user?.email,
    isBoardAdmin: boards.isBoardAdmin,
  });

  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardDescription, setNewBoardDescription] = useState("");
  const [showInvites, setShowInvites] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"viewer" | "participant">("viewer");

  const handleAuthSuccess = useCallback(
    (id: string) => {
      setUserId(id);
    },
    [setUserId]
  );

  const handleLogout = useCallback(() => {
    clearSession();
    setCurrentParentId(null);
  }, [clearSession]);

  const handleCreateBoard = useCallback(async () => {
    await boards.createBoard(newBoardName, newBoardDescription);
    setNewBoardName("");
    setNewBoardDescription("");
  }, [boards, newBoardName, newBoardDescription]);

  const handleSendInvite = useCallback(async () => {
    await invites.sendInvite(inviteEmail, inviteRole);
    setInviteEmail("");
    setInviteRole("viewer");
  }, [invites, inviteEmail, inviteRole]);

  if (userId && user === undefined) {
    return <Loading message="Loading account..." fullScreen />;
  }

  if (!userId || !user) {
    return <AuthCard auth={auth} onSuccess={handleAuthSuccess} />;
  }

  if (boards.isLoading) {
    return <Loading message="Loading data..." fullScreen />;
  }

  return (
    <div className="app-container">
      <main className="app-content">
        <header className="app-header">
          <div>
            <span className="app-title">Allocation Boards</span>
            <span className="app-subtitle">Signed in as {user.name}</span>
          </div>
          <div className="header-actions">
            <button
              className="invite-button"
              onClick={() => setShowInvites((prev) => !prev)}
            >
              Invites
              {invites.inviteCount > 0 && (
                <span className="invite-count">{invites.inviteCount}</span>
              )}
            </button>
            <button className="ghost-button" onClick={handleLogout}>
              Sign out
            </button>
          </div>
        </header>

        {showInvites && (
          <section className="invites-panel">
            <div className="invites-header">
              <div>
                <h2>Invitations</h2>
                <p>Accept or decline your board invites.</p>
              </div>
              <button
                className="ghost-button"
                onClick={() => setShowInvites(false)}
              >
                Close
              </button>
            </div>
            {invites.actionError && (
              <div className="auth-error">{invites.actionError}</div>
            )}
            {invites.inviteCount === 0 ? (
              <div className="board-empty">No pending invites.</div>
            ) : (
              <div className="invites-list">
                {invites.invitesForUser?.map((invite) => (
                  <div key={invite.inviteId} className="invite-card">
                    <div className="invite-info">
                      <div className="invite-title">{invite.boardName}</div>
                      <div className="invite-meta">
                        Invited by {invite.invitedByName} • {invite.role}
                      </div>
                      <div className="invite-desc">
                        {invite.boardDescription || "No description"}
                      </div>
                    </div>
                    <div className="invite-actions">
                      <button
                        className="auth-submit"
                        onClick={() => invites.acceptInvite(invite.inviteId)}
                      >
                        Accept
                      </button>
                      <button
                        className="ghost-button"
                        onClick={() => invites.declineInvite(invite.inviteId)}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <BoardList
          boards={boards.boards}
          selectedBoardId={boardId}
          onSelectBoard={boards.selectBoard}
          name={newBoardName}
          description={newBoardDescription}
          error={boards.createError}
          onNameChange={setNewBoardName}
          onDescriptionChange={setNewBoardDescription}
          onCreate={handleCreateBoard}
        />

        {boardId && boards.board && (
          <section className="board-settings">
            {boards.isBoardAdmin && (
              <div className="board-settings-config">
                <div className="board-settings-header">
                  <div>
                    <h2>{boards.board.name} settings</h2>
                    <p>Choose which categories are available on this board.</p>
                  </div>
                  <div className="board-settings-actions">
                    {categoryFilter.availableCategoryIds.length > 0 && (
                      <button
                        className="ghost-button"
                        onClick={categoryFilter.allowAllCategories}
                      >
                        Allow all categories
                      </button>
                    )}
                  </div>
                </div>
                <label>
                  Unit name
                  <input
                    type="text"
                    value={boardSettings.settings.unit}
                    onChange={(e) =>
                      boardSettings.updateSettings({ unit: e.target.value })
                    }
                    placeholder="Units"
                  />
                </label>
                <label>
                  Unit symbol
                  <input
                    type="text"
                    value={boardSettings.settings.symbol}
                    onChange={(e) =>
                      boardSettings.updateSettings({ symbol: e.target.value })
                    }
                    placeholder="u"
                  />
                </label>
                <label className="setting-toggle">
                  <span>Allow participants to create categories</span>
                  <input
                    type="checkbox"
                    checked={
                      boardSettings.settings.participantsCanCreateCategories
                    }
                    onChange={(e) =>
                      boardSettings.updateSettings({
                        participantsCanCreateCategories: e.target.checked,
                      })
                    }
                  />
                </label>
              </div>
            )}

            <div className="category-grid">
              {categories.rootCategories.map((category) => (
                <label key={category._id} className="category-option">
                  <input
                    type="checkbox"
                    checked={categoryFilter.isCategoryAvailable(category._id)}
                    onChange={() => categoryFilter.toggleCategory(category._id)}
                  />
                  <span className="category-label">{category.name}</span>
                </label>
              ))}
            </div>
            <div className="category-hint">
              {categoryFilter.availableCategoryIds.length === 0
                ? "All categories are available."
                : `${categoryFilter.availableCategoryIds.length} root categories selected.`}
            </div>

            {boards.isBoardAdmin && (
              <div className="board-invites">
                <h3>Invites</h3>
                <div className="board-invite-form">
                  <label>
                    Email
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="name@company.com"
                    />
                  </label>
                  <label>
                    Role
                    <select
                      value={inviteRole}
                      onChange={(e) =>
                        setInviteRole(e.target.value as "viewer" | "participant")
                      }
                    >
                      <option value="viewer">Viewer</option>
                      <option value="participant">Participant</option>
                    </select>
                  </label>
                  <button className="auth-submit" onClick={handleSendInvite}>
                    Send invite
                  </button>
                </div>
                {invites.sendError && (
                  <div className="auth-error">{invites.sendError}</div>
                )}
                {invites.boardInvites && invites.boardInvites.length > 0 ? (
                  <div className="board-invite-list">
                    {invites.boardInvites.map((invite) => (
                      <div key={invite.inviteId} className="invite-row">
                        <div>
                          <div className="invite-email">{invite.email}</div>
                          <div className="invite-meta">
                            {invite.role} • Sent by {invite.invitedByName}
                          </div>
                        </div>
                        <div className="invite-row-actions">
                          <span
                            className={`invite-status status-${invite.status}`}
                          >
                            {invite.status}
                          </span>
                          <button
                            className="ghost-button"
                            onClick={() => invites.revokeInvite(invite.inviteId)}
                          >
                            {invite.status === "pending" ? "Revoke" : "Remove"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="board-empty">No pending invites.</div>
                )}
              </div>
            )}

            {boards.isBoardAdmin && (
              <div className="board-danger">
                <div>
                  <h3>Danger zone</h3>
                  <p>Remove this board and all related allocations.</p>
                </div>
                <button className="danger-button" onClick={boards.deleteBoard}>
                  Delete board
                </button>
              </div>
            )}
          </section>
        )}

        {boardId && boards.board && (
          <Body
            key={currentParentId ?? "root"}
            categories={categories.visibleCategories}
            allocations={allocations.allocations}
            currentParentId={currentParentId}
            breadcrumbPath={[]}
            onAllocationChange={allocations.handleAllocationChange}
            onNavigate={setCurrentParentId}
            onCreateCategory={categories.createCategory}
            canCreateCategories={boards.canCreateCategories}
            unit={boardSettings.settings.unit}
            symbol={boardSettings.settings.symbol}
          />
        )}
      </main>
    </div>
  );
}

export default App;
