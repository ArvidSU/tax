import { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
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
import { UserAllocationPrefs } from "./features/allocations/components/UserAllocationPrefs";
import { Body } from "./components/Body";
import "./App.css";

type ThemeMode = "auto" | "light" | "dark";
const themeStorageKey = "allocation-boards-theme-mode";

const defaultBoardSettings = {
  participantsCanCreateCategories: true,
  undistributedStrategy: "average" as const,
  unit: "USD",
  symbol: "$",
  symbolPosition: "prefix" as const,
  minAllocation: 0,
  maxAllocation: 0,
};

function App() {
  const { userId, boardId, setUserId, setBoardId, clearSession } = useSession();
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") {
      return "auto";
    }

    const stored = window.localStorage.getItem(themeStorageKey);
    if (stored === "light" || stored === "dark" || stored === "auto") {
      return stored;
    }
    return "auto";
  });

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

  const selectedBoardSettings = useMemo(
    () => ({
      ...defaultBoardSettings,
      ...(boards.board?.settings ?? {}),
    }),
    [boards.board?.settings]
  );

  const boardSettings = useBoardSettings({
    boardId,
    userId,
    isAdmin: boards.isBoardAdmin,
    defaultSettings: selectedBoardSettings,
  });
  const updateBoardPublic = useMutation(api.boards.updatePublic);
  const boardMembers = useQuery(
    api.boards.listMembers,
    boardId && userId
      ? {
          boardId: boardId as Id<"boards">,
          requesterId: userId as Id<"users">,
        }
      : "skip"
  );

  const categories = useCategories({
    selectedBoardId: boardId,
    userId,
    canCreateCategories: boards.canCreateCategories,
    availableCategoryIds: [],
  });

  const categoryFilter = useCategoryFilter(categories.rootCategories);

  const currentLevelCategories = categories.currentLevelCategories(currentParentId);

  const breadcrumbPath = useMemo(() => {
    if (!currentParentId) return [];

    const categoryById = new Map(
      categories.visibleCategories.map((category) => [category._id.toString(), category])
    );

    const path: { id: string | null; name: string }[] = [];
    const visited = new Set<string>();
    let cursor: string | undefined = currentParentId;

    while (cursor) {
      if (visited.has(cursor)) {
        break;
      }
      visited.add(cursor);

      const category = categoryById.get(cursor);
      if (!category) {
        break;
      }

      path.unshift({
        id: category._id.toString(),
        name: category.name,
      });
      cursor = category.parentId;
    }

    return path;
  }, [categories.visibleCategories, currentParentId]);

  useEffect(() => {
    if (!currentParentId) return;

    const exists = categories.visibleCategories.some(
      (category) => category._id.toString() === currentParentId
    );

    if (!exists) {
      setCurrentParentId(null);
    }
  }, [categories.visibleCategories, currentParentId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const root = document.documentElement;

    if (themeMode === "auto") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", themeMode);
    }

    window.localStorage.setItem(themeStorageKey, themeMode);
  }, [themeMode]);

  const allocations = useAllocations({
    userId,
    boardId,
    currentParentId,
    currentLevelCategories,
  });
  const [viewedMemberId, setViewedMemberId] = useState<string | null>(null);

  useEffect(() => {
    setViewedMemberId(userId);
  }, [boardId, userId]);

  const memberViewOptions = useMemo(() => {
    const fromBoard = (boardMembers ?? []).map((member) => ({
      userId: member.userId.toString(),
      name: member.name,
      email: member.email,
      role: member.role,
      allocationTotal: member.allocationTotal,
    }));

    if (!userId || !user) {
      return fromBoard;
    }

    if (fromBoard.some((member) => member.userId === userId)) {
      return fromBoard;
    }

    return [
      {
        userId,
        name: user.name,
        email: user.email,
        role: boards.boardRole ?? "viewer",
        allocationTotal: boards.allocationTotal,
      },
      ...fromBoard,
    ];
  }, [
    boardMembers,
    boards.allocationTotal,
    boards.boardRole,
    user,
    userId,
  ]);

  useEffect(() => {
    if (!userId || memberViewOptions.length === 0) return;

    const nextViewedId = viewedMemberId ?? userId;
    const exists = memberViewOptions.some((member) => member.userId === nextViewedId);
    if (!exists) {
      setViewedMemberId(userId);
    }
  }, [memberViewOptions, userId, viewedMemberId]);

  const viewedMember = useMemo(() => {
    const targetId = viewedMemberId ?? userId;
    if (!targetId) return null;
    return memberViewOptions.find((member) => member.userId === targetId) ?? null;
  }, [memberViewOptions, userId, viewedMemberId]);

  const viewedUserId = viewedMember?.userId ?? userId;
  const isViewingOwnAllocations = !!userId && viewedUserId === userId;
  const viewedMemberAllocationsRaw = useQuery(
    api.distributions.getByBoardAndUser,
    boardId && viewedUserId && !isViewingOwnAllocations
      ? {
          boardId: boardId as Id<"boards">,
          userId: viewedUserId as Id<"users">,
        }
      : "skip"
  );
  const viewedAllocations = useMemo(() => {
    if (isViewingOwnAllocations) {
      return allocations.allocations;
    }

    const next = new Map<string, number>();
    for (const allocation of viewedMemberAllocationsRaw ?? []) {
      next.set(allocation.categoryId.toString(), allocation.percentage);
    }
    return next;
  }, [allocations.allocations, isViewingOwnAllocations, viewedMemberAllocationsRaw]);
  const viewedMemberAllocationTotal = viewedMember?.allocationTotal ?? boards.allocationTotal;
  const isLoadingViewedAllocations =
    !isViewingOwnAllocations && viewedMemberAllocationsRaw === undefined;

  const categoryById = useMemo(
    () =>
      new Map(
        categories.visibleCategories.map((category) => [category._id.toString(), category])
      ),
    [categories.visibleCategories]
  );

  const currentLevelAllocationTotal = useMemo(() => {
    if (!currentParentId) return viewedMemberAllocationTotal;

    const visited = new Set<string>();
    let cursor: string | undefined = currentParentId;
    let effectivePercentage = 100;

    while (cursor) {
      if (visited.has(cursor)) {
        return 0;
      }
      visited.add(cursor);

      const category = categoryById.get(cursor);
      if (!category) {
        return 0;
      }

      const ownPercentage = viewedAllocations.get(cursor) ?? 0;
      effectivePercentage = (effectivePercentage * ownPercentage) / 100;
      cursor = category.parentId;
    }

    return (viewedMemberAllocationTotal * effectivePercentage) / 100;
  }, [
    categoryById,
    currentParentId,
    viewedAllocations,
    viewedMemberAllocationTotal,
  ]);

  const invites = useInvites({
    userId,
    boardId,
    userEmail: user?.email,
    isBoardAdmin: boards.isBoardAdmin,
  });

  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardDescription, setNewBoardDescription] = useState("");
  const [showCreateBoardForm, setShowCreateBoardForm] = useState(false);
  const [showInvites, setShowInvites] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"owner" | "participant" | "viewer">("viewer");
  const [isUpdatingBoardPublic, setIsUpdatingBoardPublic] = useState(false);

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
    setShowCreateBoardForm(false);
  }, [boards, newBoardName, newBoardDescription]);

  const handleSendInvite = useCallback(async () => {
    await invites.sendInvite(inviteEmail, inviteRole);
    setInviteEmail("");
    setInviteRole("viewer");
  }, [invites, inviteEmail, inviteRole]);

  const handleToggleBoardPublic = useCallback(
    async (nextPublic: boolean) => {
      if (!boardId || !userId || !boards.isBoardAdmin) return;
      setIsUpdatingBoardPublic(true);
      try {
        await updateBoardPublic({
          boardId: boardId as Id<"boards">,
          userId: userId as Id<"users">,
          public: nextPublic,
        });
      } finally {
        setIsUpdatingBoardPublic(false);
      }
    },
    [boardId, userId, boards.isBoardAdmin, updateBoardPublic]
  );

  const canDeleteCategory = useCallback(
    (category: { createdBy?: string }) =>
      boards.isBoardAdmin || (!!userId && category.createdBy === userId),
    [boards.isBoardAdmin, userId]
  );
  const canEditCategory = canDeleteCategory;
  const parseOptionalRangeValue = (raw: string): number => {
    if (!raw.trim()) return 0;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return parsed;
  };
  const rangeIsInvalid =
    boardSettings.settings.maxAllocation > 0 &&
    boardSettings.settings.minAllocation > boardSettings.settings.maxAllocation;
  const symbolPreview = boardSettings.settings.symbol || "¤";

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
        <section className="workspace-shell">
          <header className="workspace-topbar">
            <div>
              <span className="app-title">Allocation Boards</span>
              <span className="app-subtitle">Signed in as {user.name}</span>
            </div>
            <div className="header-actions">
              <label className="theme-select">
                Theme
                <select
                  value={themeMode}
                  onChange={(e) => setThemeMode(e.target.value as ThemeMode)}
                  aria-label="Theme mode"
                >
                  <option value="auto">Auto</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </label>
              <button
                className="create-board-button"
                onClick={() => setShowCreateBoardForm((prev) => !prev)}
              >
                {showCreateBoardForm ? "Close new board" : "Create new board"}
              </button>
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
                <button className="ghost-button" onClick={() => setShowInvites(false)}>
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

          <section className="workspace-board-row">
            <BoardList
              boards={boards.boards}
              selectedBoardId={boardId}
              onSelectBoard={boards.selectBoard}
              showCreateForm={showCreateBoardForm}
              onToggleCreateForm={() => setShowCreateBoardForm((prev) => !prev)}
              name={newBoardName}
              description={newBoardDescription}
              error={boards.createError}
              onNameChange={setNewBoardName}
              onDescriptionChange={setNewBoardDescription}
              onCreate={handleCreateBoard}
            />
          </section>

          {boardId && boards.board && (
            <section className="workspace-settings-panel board-settings">
              <div className="board-settings-header">
                <div>
                  <h2>{boards.board.name} settings</h2>
                </div>
                <div className="board-settings-actions">
                  {boards.isBoardAdmin &&
                    categoryFilter.availableCategoryIds.length > 0 && (
                      <button
                        className="ghost-button"
                        onClick={categoryFilter.allowAllCategories}
                      >
                        Allow all categories
                      </button>
                    )}
                </div>
              </div>

              {boards.isBoardAdmin ? (
                <>
                  <details className="board-settings-card" open>
                    <summary className="board-settings-summary">
                      <h3>Board settings</h3>
                    </summary>
                    <div className="board-settings-content">
                      <div className="board-settings-config">
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
                        <label>
                          Symbol placement
                          <select
                            value={boardSettings.settings.symbolPosition}
                            onChange={(e) =>
                              boardSettings.updateSettings({
                                symbolPosition: e.target.value as "prefix" | "suffix",
                              })
                            }
                          >
                            <option value="prefix">
                              Prefix ({symbolPreview}100)
                            </option>
                            <option value="suffix">
                              Suffix (100{symbolPreview})
                            </option>
                          </select>
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
                        <label className="setting-toggle">
                          <span>Public board</span>
                          <input
                            type="checkbox"
                            checked={boards.board.public}
                            disabled={isUpdatingBoardPublic}
                            onChange={(e) => void handleToggleBoardPublic(e.target.checked)}
                          />
                        </label>
                        <label>
                          Minimum allocation total (optional)
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={
                              boardSettings.settings.minAllocation > 0
                                ? boardSettings.settings.minAllocation
                                : ""
                            }
                            onChange={(e) =>
                              boardSettings.updateSettings({
                                minAllocation: parseOptionalRangeValue(e.target.value),
                              })
                            }
                            placeholder="No minimum"
                          />
                        </label>
                        <label>
                          Maximum allocation total (optional)
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={
                              boardSettings.settings.maxAllocation > 0
                                ? boardSettings.settings.maxAllocation
                                : ""
                            }
                            onChange={(e) =>
                              boardSettings.updateSettings({
                                maxAllocation: parseOptionalRangeValue(e.target.value),
                              })
                            }
                            placeholder="No maximum"
                          />
                        </label>
                      </div>
                      <p className="board-membership-note">
                        Leave min/max blank to allow any member total allocation value.
                      </p>
                      {rangeIsInvalid && (
                        <div className="auth-error">
                          Minimum allocation cannot be greater than maximum allocation.
                        </div>
                      )}

                      <div className="category-grid">
                        {categories.rootCategories.map((category) => (
                          <label key={category._id} className="category-option">
                            <input
                              type="checkbox"
                              checked={categoryFilter.isCategoryAvailable(category._id)}
                              onChange={() =>
                                categoryFilter.toggleCategory(category._id)
                              }
                            />
                            <span className="category-label">{category.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </details>

                  <details className="board-invites" open>
                    <summary className="board-settings-summary">
                      <h3>Invites</h3>
                    </summary>
                    <div className="board-settings-content">
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
                              setInviteRole(e.target.value as "owner" | "participant" | "viewer")
                            }
                          >
                            <option value="owner">Owner</option>
                            <option value="participant">Participant</option>
                            <option value="viewer">Viewer</option>
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
                                <span className={`invite-status status-${invite.status}`}>
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
                  </details>

                  <div className="board-danger">
                    <div>
                      <h3>Danger zone</h3>
                      <p>Remove this board and all related allocations.</p>
                    </div>
                    <button className="danger-button" onClick={boards.deleteBoard}>
                      Delete board
                    </button>
                  </div>
                </>
              ) : null}

              <div className="board-membership">
                <div>
                  <h3>Board membership</h3>
                  <p>
                    Leave this board to remove your access and allocations from it.
                  </p>
                  {boards.leaveBoardDisabledReason && (
                    <p className="board-membership-note">
                      {boards.leaveBoardDisabledReason}
                    </p>
                  )}
                </div>
                <button
                  className="ghost-button"
                  onClick={boards.leaveBoard}
                  disabled={boards.isLeaveBoardDisabled}
                >
                  Leave Board
                </button>
              </div>
              <UserAllocationPrefs
                boardId={boardId}
                userId={userId}
                allocationTotal={boards.allocationTotal}
                minAllocation={boardSettings.settings.minAllocation}
                maxAllocation={boardSettings.settings.maxAllocation}
                unit={boardSettings.settings.unit}
                symbol={boardSettings.settings.symbol}
                symbolPosition={boardSettings.settings.symbolPosition}
              />

              {boards.leaveError && <div className="auth-error">{boards.leaveError}</div>}
            </section>
          )}

          {boardId && boards.board && (
            <section className="workspace-sliders-panel">
              <div className="allocation-view-toolbar">
                <label className="allocation-view-select">
                  View allocations for
                  <select
                    value={viewedUserId ?? userId ?? ""}
                    onChange={(e) => setViewedMemberId(e.target.value)}
                    disabled={memberViewOptions.length === 0}
                    aria-label="Select board member allocations to view"
                  >
                    {memberViewOptions.map((member) => (
                      <option key={member.userId} value={member.userId}>
                        {member.name}
                        {member.userId === userId ? " (you)" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                {!isViewingOwnAllocations && userId && (
                  <button
                    className="ghost-button"
                    onClick={() => setViewedMemberId(userId)}
                  >
                    Back to my allocations
                  </button>
                )}
              </div>
              {!isViewingOwnAllocations && viewedMember && (
                <p className="allocation-readonly-note">
                  Viewing {viewedMember.name}&apos;s allocations in read-only mode.
                </p>
              )}
              {isLoadingViewedAllocations ? (
                <div className="allocation-loading-state">
                  <Loading message="Loading member allocations..." />
                </div>
              ) : (
                <Body
                  key={currentParentId ?? "root"}
                  categories={categories.visibleCategories}
                  allocations={viewedAllocations}
                  currentParentId={currentParentId}
                  breadcrumbPath={breadcrumbPath}
                  onAllocationChange={allocations.handleAllocationChange}
                  onNavigate={setCurrentParentId}
                  onCreateCategory={categories.createCategory}
                  onDeleteCategory={categories.deleteCategory}
                  onUpdateCategory={categories.updateCategory}
                  canDeleteCategory={canDeleteCategory}
                  canEditCategory={canEditCategory}
                  canCreateCategories={boards.canCreateCategories}
                  unit={boardSettings.settings.unit}
                  symbol={boardSettings.settings.symbol}
                  symbolPosition={boardSettings.settings.symbolPosition}
                  allocationTotal={currentLevelAllocationTotal}
                  readOnly={!isViewingOwnAllocations}
                />
              )}
            </section>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
