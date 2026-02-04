import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import {
  getStoredUserId,
  setStoredUserId,
  clearStoredUserId,
  getStoredBoardId,
  setStoredBoardId,
  clearStoredBoardId,
} from "./utils/session";
import { Body } from "./components/Body";
import type { Category } from "./components/Body";
import type { BreadcrumbItem } from "./components/Breadcrumb";
import "./App.css";

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

type BoardSettings = {
  participantsCanCreateCategories: boolean;
  undistributedStrategy: "average" | "mean" | "mirror";
  unit: string;
  symbol: string;
};

const defaultBoardSettings: BoardSettings = {
  participantsCanCreateCategories: true,
  undistributedStrategy: "average",
  unit: "USD",
  symbol: "$",
};

function App() {
  const [userId, setUserId] = useState<string | null>(() => getStoredUserId());
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(() =>
    getStoredBoardId()
  );

  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authSecret, setAuthSecret] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  const [boardName, setBoardName] = useState("");
  const [boardDescription, setBoardDescription] = useState("");
  const [boardError, setBoardError] = useState<string | null>(null);

  const [showInvites, setShowInvites] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"viewer" | "participant">(
    "viewer"
  );
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteActionError, setInviteActionError] = useState<string | null>(
    null
  );

  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [allocations, setAllocations] = useState<Map<string, number>>(
    new Map()
  );

  const [availableCategoryIds, setAvailableCategoryIds] = useState<string[]>(
    []
  );
  const [boardSettings, setBoardSettings] = useState<BoardSettings>(
    defaultBoardSettings
  );
  const [boardSettingsPatch, setBoardSettingsPatch] = useState<
    Partial<BoardSettings>
  >({});

  const user = useQuery(
    api.users.get,
    userId ? { userId: userId as Id<"users"> } : "skip"
  );
  const boards = useQuery(
    api.boards.listForUser,
    userId ? { userId: userId as Id<"users"> } : "skip"
  );
  const board = useQuery(
    api.boards.get,
    selectedBoardId ? { boardId: selectedBoardId as Id<"boards"> } : "skip"
  );
  const allCategories = useQuery(api.categories.list);

  const allocationsRaw = useQuery(
    api.distributions.getByBoardAndUser,
    userId && selectedBoardId
      ? {
          userId: userId as Id<"users">,
          boardId: selectedBoardId as Id<"boards">,
        }
      : "skip"
  );

  const invitesForUser = useQuery(
    api.invites.listForUser,
    user?.email ? { email: user.email } : "skip"
  );

  const currentCategoryPath = useQuery(
    api.categories.getPath,
    currentParentId
      ? { categoryId: currentParentId as Id<"categories"> }
      : "skip"
  );

  const selectedBoardEntry = useMemo(() => {
    if (!boards || !selectedBoardId) return null;
    return (boards as { board: { _id: string }; role: string }[]).find(
      (entry) => entry.board._id === selectedBoardId
    );
  }, [boards, selectedBoardId]);

  const isBoardAdmin = selectedBoardEntry?.role === "owner";

  const boardRole = (selectedBoardEntry?.role ?? null) as
    | "owner"
    | "participant"
    | "viewer"
    | null;

  const canCreateCategories =
    boardRole === "owner" ||
    (boardRole === "participant" &&
      boardSettings.participantsCanCreateCategories);

  const boardInvites = useQuery(
    api.invites.listForBoard,
    selectedBoardId && userId && isBoardAdmin
      ? {
          boardId: selectedBoardId as Id<"boards">,
          userId: userId as Id<"users">,
        }
      : "skip"
  );

  const inviteCount = invitesForUser?.length ?? 0;

  const login = useMutation(api.users.login);
  const register = useMutation(api.users.register);
  const createBoard = useMutation(api.boards.create);
  const updateBoardSettings = useMutation(api.boards.updateSettings);
  const removeBoard = useMutation(api.boards.remove);
  const upsertDistributionLevel = useMutation(api.distributions.upsertLevel);
  const createCategory = useMutation(api.categories.create);
  const createInvite = useMutation(api.invites.create);
  const revokeInvite = useMutation(api.invites.revoke);
  const acceptInvite = useMutation(api.invites.accept);
  const declineInvite = useMutation(api.invites.decline);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boardSettingsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const initializedAllocationsRef = useRef<string | null>(null);
  const initializedSettingsRef = useRef<string | null>(null);

  useEffect(() => {
    if (boards && boards.length > 0 && !selectedBoardId) {
      const firstBoardId = boards[0].board._id as string;
      setSelectedBoardId(firstBoardId);
      setStoredBoardId(firstBoardId);
    }
  }, [boards, selectedBoardId]);

  useEffect(() => {
    if (!board) return;
    const boardKey = board._id.toString();
    if (initializedSettingsRef.current === boardKey) return;
    initializedSettingsRef.current = boardKey;
    const settings = (board.settings ?? {}) as Partial<BoardSettings>;
    setAvailableCategoryIds([]);
    setBoardSettings({
      participantsCanCreateCategories:
        typeof settings.participantsCanCreateCategories === "boolean"
          ? settings.participantsCanCreateCategories
          : defaultBoardSettings.participantsCanCreateCategories,
      undistributedStrategy:
        settings.undistributedStrategy === "average" ||
        settings.undistributedStrategy === "mean" ||
        settings.undistributedStrategy === "mirror"
          ? settings.undistributedStrategy
          : defaultBoardSettings.undistributedStrategy,
      unit:
        typeof settings.unit === "string"
          ? settings.unit
          : defaultBoardSettings.unit,
      symbol:
        typeof settings.symbol === "string"
          ? settings.symbol
          : defaultBoardSettings.symbol,
    });
    setBoardSettingsPatch({});
  }, [board]);

  const queueBoardSettingsPatch = useCallback((patch: Partial<BoardSettings>) => {
    setBoardSettings((prev) => ({ ...prev, ...patch }));
    setBoardSettingsPatch((prev) => ({ ...prev, ...patch }));
  }, []);

  useEffect(() => {
    if (!board || !userId || !isBoardAdmin) return;
    if (Object.keys(boardSettingsPatch).length === 0) return;
    if (boardSettingsTimeoutRef.current) {
      clearTimeout(boardSettingsTimeoutRef.current);
    }
    const patchToSend = boardSettingsPatch;
    boardSettingsTimeoutRef.current = setTimeout(() => {
      setBoardSettingsPatch({});
      updateBoardSettings({
        boardId: board._id as Id<"boards">,
        userId: userId as Id<"users">,
        settings: patchToSend,
      });
    }, 300);

    return () => {
      if (boardSettingsTimeoutRef.current) {
        clearTimeout(boardSettingsTimeoutRef.current);
      }
    };
  }, [boardSettingsPatch, board, userId, isBoardAdmin, updateBoardSettings]);

  useEffect(() => {
    if (!allocationsRaw || !selectedBoardId || !userId) return;
    const allocationKey = `${selectedBoardId}-${userId}`;
    if (initializedAllocationsRef.current === allocationKey) return;
    initializedAllocationsRef.current = allocationKey;
    const nextAllocations = new Map<string, number>();
    for (const allocation of allocationsRaw) {
      nextAllocations.set(allocation.categoryId, allocation.percentage);
    }
    setAllocations(nextAllocations);
  }, [allocationsRaw, selectedBoardId, userId]);

  useEffect(() => {
    setCurrentParentId(null);
    setAllocations(new Map());
    initializedAllocationsRef.current = null;
  }, [selectedBoardId]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (boardSettingsTimeoutRef.current) {
        clearTimeout(boardSettingsTimeoutRef.current);
      }
    };
  }, []);

  const categoryById = useMemo(() => {
    const map = new Map<string, Category>();
    (allCategories ?? []).forEach((category) => {
      map.set(category._id.toString(), category as Category);
    });
    return map;
  }, [allCategories]);

  const rootIdByCategoryId = useMemo(() => {
    const rootMap = new Map<string, string>();
    const resolveRoot = (categoryId: string): string => {
      const cached = rootMap.get(categoryId);
      if (cached) return cached;
      const category = categoryById.get(categoryId);
      if (!category || !category.parentId) {
        rootMap.set(categoryId, categoryId);
        return categoryId;
      }
      const rootId = resolveRoot(category.parentId);
      rootMap.set(categoryId, rootId);
      return rootId;
    };

    categoryById.forEach((_, categoryId) => {
      resolveRoot(categoryId);
    });

    return rootMap;
  }, [categoryById]);

  const visibleCategories = useMemo(() => {
    if (!allCategories) return [];
    if (!availableCategoryIds || availableCategoryIds.length === 0) {
      return allCategories as Category[];
    }
    const allowedRoots = new Set(availableCategoryIds);
    return (allCategories as Category[]).filter((category) => {
      const rootId = rootIdByCategoryId.get(category._id.toString());
      return rootId ? allowedRoots.has(rootId) : false;
    });
  }, [allCategories, availableCategoryIds, rootIdByCategoryId]);

  useEffect(() => {
    if (!currentParentId) return;
    const visibleIds = new Set(visibleCategories.map((c) => c._id.toString()));
    if (!visibleIds.has(currentParentId)) {
      setCurrentParentId(null);
    }
  }, [currentParentId, visibleCategories]);

  const currentLevelCategories = useMemo(() => {
    return visibleCategories.filter((category) => {
      if (!currentParentId) {
        return category.parentId === undefined;
      }
      return category.parentId === currentParentId;
    });
  }, [visibleCategories, currentParentId]);

  const breadcrumbPath: BreadcrumbItem[] = useMemo(() => {
    if (!currentCategoryPath) return [];
    return currentCategoryPath.map((cat) => ({
      id: cat._id,
      name: cat.name,
    }));
  }, [currentCategoryPath]);



  const handleAllocationChange = useCallback(
    (categoryId: string, value: number) => {
      setAllocations((prev) => {
        const next = new Map(prev);
        if (value === 0) {
          next.delete(categoryId);
        } else {
          next.set(categoryId, value);
        }
        return next;
      });

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        if (!userId || !selectedBoardId) return;
        setAllocations((latestAllocations) => {
          const levelAllocations = currentLevelCategories
            .map((cat) => ({
              categoryId: cat._id as Id<"categories">,
              percentage: latestAllocations.get(cat._id) ?? 0,
            }))
            .filter((allocation) => allocation.percentage > 0);

          const total = levelAllocations.reduce(
            (sum, allocation) => sum + allocation.percentage,
            0
          );

          if (total === 100) {
            upsertDistributionLevel({
              boardId: selectedBoardId as Id<"boards">,
              userId: userId as Id<"users">,
              parentId: currentParentId
                ? (currentParentId as Id<"categories">)
                : undefined,
              allocations: levelAllocations,
            });
          }

          return latestAllocations;
        });
      }, 300);
    },
    [
      userId,
      selectedBoardId,
      currentParentId,
      currentLevelCategories,
      upsertDistributionLevel,
    ]
  );

  const handleNavigate = useCallback((categoryId: string | null) => {
    setCurrentParentId(categoryId);
  }, []);

  const handleCreateCategory = useCallback(
    async (name: string, parentId: string | null) => {
      if (!userId || !selectedBoardId) return;
      if (!canCreateCategories) return;
      await createCategory({
        boardId: selectedBoardId as Id<"boards">,
        userId: userId as Id<"users">,
        name,
        parentId: parentId ? (parentId as Id<"categories">) : undefined,
      });
    },
    [createCategory, userId, selectedBoardId, canCreateCategories]
  );

  const handleAuthSubmit = useCallback(async () => {
    setAuthError(null);
    const email = normalizeEmail(authEmail);
    if (!isValidEmail(email)) {
      setAuthError("Please enter a valid email address");
      return;
    }
    try {
      const id =
        authMode === "register"
          ? await register({
              name: authName.trim(),
              email,
              secret: authSecret,
            })
          : await login({
              email,
              secret: authSecret,
            });
      setUserId(id as string);
      setStoredUserId(id as string);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
      setAuthError(message);
    }
  }, [authMode, authName, authEmail, authSecret, login, register]);

  const handleLogout = useCallback(() => {
    clearStoredUserId();
    clearStoredBoardId();
    setUserId(null);
    setSelectedBoardId(null);
    setCurrentParentId(null);
    setAllocations(new Map());
  }, []);

  const handleBoardCreate = useCallback(async () => {
    if (!userId) return;
    setBoardError(null);
    if (!boardName.trim()) {
      setBoardError("Board name is required");
      return;
    }
    try {
      const newBoardId = await createBoard({
        name: boardName.trim(),
        description: boardDescription.trim(),
        ownerId: userId as Id<"users">,
        public: false,
        settings: {
          participantsCanCreateCategories: true,
          undistributedStrategy: "average",
          unit: "USD",
          symbol: "$",
        },
      });
      setBoardName("");
      setBoardDescription("");
      const idString = newBoardId as string;
      setSelectedBoardId(idString);
      setStoredBoardId(idString);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create board";
      setBoardError(message);
    }
  }, [
    userId,
    boardName,
    boardDescription,
    createBoard,
    setStoredBoardId,
  ]);

  const handleBoardSelect = useCallback((boardId: string) => {
    setSelectedBoardId(boardId);
    setStoredBoardId(boardId);
  }, []);

  const rootCategories = useMemo(() => {
    if (!allCategories) return [];
    return (allCategories as Category[]).filter(
      (category) => category.parentId === undefined
    );
  }, [allCategories]);

  const handleToggleCategory = useCallback(
    (categoryId: string) => {
      setAvailableCategoryIds((prev) => {
        if (prev.length === 0) {
          const allRootIds = rootCategories.map((category) =>
            category._id.toString()
          );
          return allRootIds.filter((id) => id !== categoryId);
        }
        return prev.includes(categoryId)
          ? prev.filter((id) => id !== categoryId)
          : [...prev, categoryId];
      });
    },
    [rootCategories]
  );

  const handleAllowAllCategories = useCallback(() => {
    setAvailableCategoryIds([]);
  }, []);

  const handleInviteSend = useCallback(async () => {
    if (!selectedBoardId || !userId) return;
    setInviteError(null);
    const email = normalizeEmail(inviteEmail);
    if (!email) {
      setInviteError("Email is required");
      return;
    }
    if (!isValidEmail(email)) {
      setInviteError("Please enter a valid email address");
      return;
    }

    try {
      await createInvite({
        boardId: selectedBoardId as Id<"boards">,
        email,
        invitedBy: userId as Id<"users">,
        role: inviteRole,
      });
      setInviteEmail("");
      setInviteRole("viewer");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to send invite";
      setInviteError(message);
    }
  }, [
    selectedBoardId,
    userId,
    inviteEmail,
    inviteRole,
    createInvite,
  ]);

  const handleInviteRevoke = useCallback(
    async (inviteId: string) => {
      if (!userId) return;
      await revokeInvite({
        inviteId: inviteId as Id<"boardInvites">,
        userId: userId as Id<"users">,
      });
    },
    [revokeInvite, userId]
  );

  const handleInviteAccept = useCallback(
    async (inviteId: string, boardId: string) => {
      if (!userId) return;
      setInviteActionError(null);
      try {
        await acceptInvite({
          inviteId: inviteId as Id<"boardInvites">,
          userId: userId as Id<"users">,
        });
        setSelectedBoardId(boardId);
        setStoredBoardId(boardId);
        setShowInvites(false);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to accept invite";
        setInviteActionError(message);
      }
    },
    [acceptInvite, userId]
  );

  const handleInviteDecline = useCallback(
    async (inviteId: string) => {
      if (!userId) return;
      setInviteActionError(null);
      try {
        await declineInvite({
          inviteId: inviteId as Id<"boardInvites">,
          userId: userId as Id<"users">,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to decline invite";
        setInviteActionError(message);
      }
    },
    [declineInvite, userId]
  );

  const handleBoardDelete = useCallback(async () => {
    if (!selectedBoardId || !userId) return;
    const confirmed = window.confirm(
      "Delete this board and all related allocations?"
    );
    if (!confirmed) return;
    await removeBoard({
      boardId: selectedBoardId as Id<"boards">,
      userId: userId as Id<"users">,
    });
    clearStoredBoardId();
    setSelectedBoardId(null);
    setCurrentParentId(null);
    setAllocations(new Map());
  }, [removeBoard, selectedBoardId, userId]);

  if (userId && user === undefined) {
    return (
      <div className="app-loading">
        <div className="loading-spinner" />
        <p>Loading account...</p>
      </div>
    );
  }

  if (!userId || !user) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1>Allocation Boards</h1>
          <p>Sign in to create a board and allocate categories.</p>
          <div className="auth-toggle">
            <button
              className={authMode === "login" ? "active" : ""}
              onClick={() => setAuthMode("login")}
            >
              Login
            </button>
            <button
              className={authMode === "register" ? "active" : ""}
              onClick={() => setAuthMode("register")}
            >
              Register
            </button>
          </div>
          {authMode === "register" && (
            <label>
              Name
              <input
                type="text"
                value={authName}
                onChange={(e) => setAuthName(e.target.value)}
              />
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
            />
          </label>
          <label>
            Secret
            <input
              type="password"
              value={authSecret}
              onChange={(e) => setAuthSecret(e.target.value)}
            />
          </label>
          {authError && <div className="auth-error">{authError}</div>}
          <button className="auth-submit" onClick={handleAuthSubmit}>
            {authMode === "register" ? "Create account" : "Login"}
          </button>
        </div>
      </div>
    );
  }

  const isLoading = allCategories === undefined;
  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner" />
        <p>Loading data...</p>
      </div>
    );
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
              {inviteCount > 0 && (
                <span className="invite-count">{inviteCount}</span>
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
            {inviteActionError && (
              <div className="auth-error">{inviteActionError}</div>
            )}
            {inviteCount === 0 ? (
              <div className="board-empty">No pending invites.</div>
            ) : (
              <div className="invites-list">
                {invitesForUser?.map((invite) => (
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
                        onClick={() =>
                          handleInviteAccept(
                            invite.inviteId,
                            invite.boardId as string
                          )
                        }
                      >
                        Accept
                      </button>
                      <button
                        className="ghost-button"
                        onClick={() =>
                          handleInviteDecline(invite.inviteId)
                        }
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

        <section className="board-panel">
          <div className="board-list">
            <h2>Your boards</h2>
            {boards && boards.length > 0 ? (
              <div className="board-list-grid">
                {boards.map((entry) => {
                  const { board: boardItem, role } = entry as {
                    board: {
                      _id: string;
                      name: string;
                      description: string;
                    };
                    role: string;
                  };
                  return (
                  <button
                    key={boardItem._id}
                    className={`board-card ${
                      selectedBoardId === boardItem._id ? "active" : ""
                    }`}
                    onClick={() => handleBoardSelect(boardItem._id as string)}
                  >
                    <div className="board-card-title">{boardItem.name}</div>
                    <div className="board-card-meta">{role}</div>
                    <div className="board-card-desc">
                      {boardItem.description || "No description"}
                    </div>
                  </button>
                  );
                })}
              </div>
            ) : (
              <div className="board-empty">No boards yet.</div>
            )}
          </div>

          <div className="board-create">
            <h2>Create a board</h2>
            <label>
              Board name
              <input
                type="text"
                value={boardName}
                onChange={(e) => setBoardName(e.target.value)}
              />
            </label>
            <label>
              Description
              <textarea
                value={boardDescription}
                onChange={(e) => setBoardDescription(e.target.value)}
                rows={3}
              />
            </label>
            {boardError && <div className="auth-error">{boardError}</div>}
            <button className="auth-submit" onClick={handleBoardCreate}>
              Create board
            </button>
          </div>
        </section>

        {selectedBoardId && board ? (
          <section className="board-settings">
            <div className="board-settings-header">
              <div>
                <h2>{board.name} settings</h2>
                <p>Choose which categories are available on this board.</p>
              </div>
              <div className="board-settings-actions">
                {availableCategoryIds.length > 0 && (
                  <button
                    className="ghost-button"
                    onClick={handleAllowAllCategories}
                  >
                    Allow all categories
                  </button>
                )}
              </div>
            </div>
            {isBoardAdmin && (
              <div className="board-settings-config">
                <label>
                  Unit name
                  <input
                    type="text"
                    value={boardSettings.unit}
                    onChange={(e) =>
                      queueBoardSettingsPatch({ unit: e.target.value })
                    }
                    placeholder="Units"
                  />
                </label>
                <label>
                  Unit symbol
                  <input
                    type="text"
                    value={boardSettings.symbol}
                    onChange={(e) =>
                      queueBoardSettingsPatch({ symbol: e.target.value })
                    }
                    placeholder="u"
                  />
                </label>

                <label className="setting-toggle">
                  <span>Allow participants to create categories</span>
                  <input
                    type="checkbox"
                    checked={boardSettings.participantsCanCreateCategories}
                    onChange={(e) =>
                      queueBoardSettingsPatch({
                        participantsCanCreateCategories: e.target.checked,
                      })
                    }
                  />
                </label>
              </div>
            )}
            <div className="category-grid">
              {rootCategories.map((category) => (
                <label key={category._id} className="category-option">
                  <input
                    type="checkbox"
                    checked={
                      availableCategoryIds.length === 0 ||
                      availableCategoryIds.includes(category._id)
                    }
                    onChange={() => handleToggleCategory(category._id)}
                  />
                  <span className="category-label">{category.name}</span>
                </label>
              ))}
            </div>
            <div className="category-hint">
              {availableCategoryIds.length === 0
                ? "All categories are available."
                : `${availableCategoryIds.length} root categories selected.`}
            </div>

            {isBoardAdmin && (
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
                  <button className="auth-submit" onClick={handleInviteSend}>
                    Send invite
                  </button>
                </div>
                {inviteError && <div className="auth-error">{inviteError}</div>}
                {boardInvites && boardInvites.length > 0 ? (
                  <div className="board-invite-list">
                {boardInvites.map((invite) => (
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
                        onClick={() =>
                          handleInviteRevoke(invite.inviteId)
                        }
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

            {isBoardAdmin && (
              <div className="board-danger">
                <div>
                  <h3>Danger zone</h3>
                  <p>Remove this board and all related allocations.</p>
                </div>
                <button className="danger-button" onClick={handleBoardDelete}>
                  Delete board
                </button>
              </div>
            )}
          </section>
        ) : (
          <section className="board-settings empty">
            <h2>Select a board to configure settings</h2>
            <p>Create or choose a board to start allocating.</p>
          </section>
        )}

        {selectedBoardId && board ? (
          <Body
            key={currentParentId ?? "root"}
            categories={visibleCategories}
            allocations={allocations}
            currentParentId={currentParentId}
            breadcrumbPath={breadcrumbPath}
            onAllocationChange={handleAllocationChange}
            onNavigate={handleNavigate}
            onCreateCategory={handleCreateCategory}
            canCreateCategories={canCreateCategories}
            unit={boardSettings.unit}
            symbol={boardSettings.symbol}
          />
        ) : null}
      </main>
    </div>
  );
}

export default App;
