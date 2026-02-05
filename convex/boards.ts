import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

const defaultBoardSettings = {
  participantsCanCreateCategories: true,
  undistributedStrategy: "average" as const,
  unit: "USD",
  symbol: "$",
};

const boardSettingsValidator = v.object({
  participantsCanCreateCategories: v.boolean(),
  undistributedStrategy: v.union(
    v.literal("average"),
    v.literal("mean"),
    v.literal("mirror")
  ),
  unit: v.string(),
  symbol: v.string(),
});

const boardSettingsPatchValidator = v.object({
  participantsCanCreateCategories: v.optional(v.boolean()),
  undistributedStrategy: v.optional(
    v.union(v.literal("average"), v.literal("mean"), v.literal("mirror"))
  ),
  unit: v.optional(v.string()),
  symbol: v.optional(v.string()),
});

const boardValidator = v.object({
  _id: v.id("boards"),
  _creationTime: v.number(),
  name: v.string(),
  description: v.string(),
  public: v.boolean(),
  settings: boardSettingsValidator,
});

const boardWithRoleValidator = v.object({
  board: boardValidator,
  role: v.union(v.literal("owner"), v.literal("participant"), v.literal("viewer")),
});

/**
 * Create a board and assign the owner
 */
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    public: v.optional(v.boolean()),
    ownerId: v.id("users"),
    settings: v.optional(boardSettingsPatchValidator),
  },
  returns: v.id("boards"),
  handler: async (ctx, args) => {
    const settings = {
      ...defaultBoardSettings,
      ...(args.settings ?? {}),
    };
    const boardId = await ctx.db.insert("boards", {
      name: args.name,
      description: args.description ?? "",
      public: args.public ?? false,
      settings,
    });

    await ctx.db.insert("boardMembers", {
      boardId,
      userId: args.ownerId,
      role: "owner",
      userPrefs: {},
    });

    return boardId;
  },
});

/**
 * Get a board by ID
 */
export const get = query({
  args: { boardId: v.id("boards") },
  returns: v.union(boardValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.boardId);
  },
});

/**
 * List boards for a user with role
 */
export const listForUser = query({
  args: { userId: v.id("users") },
  returns: v.array(boardWithRoleValidator),
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("boardMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const results = [];
    for (const membership of memberships) {
      const board = await ctx.db.get(membership.boardId);
      if (!board) continue;
      results.push({
        board,
        role: membership.role,
      });
    }

    return results;
  },
});

/**
 * Update board settings (merge)
 */
export const updateSettings = mutation({
  args: {
    boardId: v.id("boards"),
    userId: v.id("users"),
    settings: boardSettingsPatchValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("boardMembers")
      .withIndex("by_board_and_user", (q) =>
        q.eq("boardId", args.boardId).eq("userId", args.userId)
      )
      .unique();

    if (!membership || membership.role !== "owner") {
      throw new ConvexError({
        code: "NOT_AUTHORIZED",
        message: "Only board owners can update board settings",
      });
    }

    const board = await ctx.db.get(args.boardId);
    if (!board) {
      throw new ConvexError({
        code: "BOARD_NOT_FOUND",
        message: "Board not found",
      });
    }

    const nextSettings = {
      participantsCanCreateCategories:
        args.settings.participantsCanCreateCategories ??
        board.settings.participantsCanCreateCategories ??
        defaultBoardSettings.participantsCanCreateCategories,
      undistributedStrategy:
        args.settings.undistributedStrategy ??
        board.settings.undistributedStrategy ??
        defaultBoardSettings.undistributedStrategy,
      unit:
        args.settings.unit ??
        board.settings.unit ??
        defaultBoardSettings.unit,
      symbol:
        args.settings.symbol ??
        board.settings.symbol ??
        defaultBoardSettings.symbol,
    };

    await ctx.db.patch(args.boardId, { settings: nextSettings });

    return null;
  },
});

/**
 * Count members on a board
 */
export const getMemberCount = query({
  args: { boardId: v.id("boards") },
  returns: v.number(),
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("boardMembers")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();
    return members.length;
  },
});

/**
 * Count owners on a board
 */
export const getOwnerCount = query({
  args: { boardId: v.id("boards") },
  returns: v.number(),
  handler: async (ctx, args) => {
    const owners = await ctx.db
      .query("boardMembers")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .filter((q) => q.eq(q.field("role"), "owner"))
      .collect();
    return owners.length;
  },
});

/**
 * Leave a board
 */
export const leave = mutation({
  args: { boardId: v.id("boards"), userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("boardMembers")
      .withIndex("by_board_and_user", (q) =>
        q.eq("boardId", args.boardId).eq("userId", args.userId)
      )
      .unique();

    if (!membership) {
      throw new ConvexError({
        code: "MEMBERSHIP_NOT_FOUND",
        message: "You are not a member of this board",
      });
    }

    if (membership.role === "owner") {
      const ownerCount = await ctx.db
        .query("boardMembers")
        .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
        .filter((q) => q.eq(q.field("role"), "owner"))
        .collect();

      if (ownerCount.length <= 1) {
        throw new ConvexError({
          code: "SOLE_OWNER",
          message: "You cannot leave while you are the only board owner",
        });
      }
    }

    const allocations = await ctx.db
      .query("allocations")
      .withIndex("by_board_user", (q) =>
        q.eq("boardId", args.boardId).eq("userId", args.userId)
      )
      .collect();

    for (const allocation of allocations) {
      await ctx.db.delete(allocation._id);
    }

    await ctx.db.delete(membership._id);
    return null;
  },
});

/**
 * Remove a board and related data (owner only)
 */
export const remove = mutation({
  args: { boardId: v.id("boards"), userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("boardMembers")
      .withIndex("by_board_and_user", (q) =>
        q.eq("boardId", args.boardId).eq("userId", args.userId)
      )
      .unique();

    if (!membership || membership.role !== "owner") {
      throw new ConvexError({
        code: "NOT_AUTHORIZED",
        message: "Only board owners can remove boards",
      });
    }

    const board = await ctx.db.get(args.boardId);
    if (!board) return null;

    const allocations = await ctx.db
      .query("allocations")
      .filter((q) => q.eq(q.field("boardId"), args.boardId))
      .collect();
    for (const allocation of allocations) {
      await ctx.db.delete(allocation._id);
    }

    const members = await ctx.db
      .query("boardMembers")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();
    for (const member of members) {
      await ctx.db.delete(member._id);
    }

    const invites = await ctx.db
      .query("boardInvites")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();
    for (const invite of invites) {
      await ctx.db.delete(invite._id);
    }

    await ctx.db.delete(args.boardId);
    return null;
  },
});
