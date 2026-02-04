import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const requireBoardAdmin = async (
  ctx: { db: any },
  boardId: Id<"boards">,
  userId: Id<"users">
) => {
  const membership = await ctx.db
    .query("boardMembers")
    .withIndex("by_board_and_user", (q: any) =>
      q.eq("boardId", boardId).eq("userId", userId)
    )
    .unique();

  if (!membership || membership.role !== "owner") {
    throw new ConvexError({
      code: "NOT_AUTHORIZED",
      message: "Only board owners can manage invites",
    });
  }
};

const toInviteSummary = (
  invite: Doc<"boardInvites">,
  board: Doc<"boards">,
  inviter: Doc<"users"> | null
) => ({
  inviteId: invite._id,
  boardId: invite.boardId,
  boardName: board.name,
  boardDescription: board.description,
  email: invite.email,
  role: invite.role,
  invitedByName: inviter?.name ?? "Unknown",
  invitedByEmail: inviter?.email ?? "",
  createdAt: invite._creationTime,
});

/**
 * List invites for a user by email
 */
export const listForUser = query({
  args: { email: v.string() },
  returns: v.array(
    v.object({
      inviteId: v.id("boardInvites"),
      boardId: v.id("boards"),
      boardName: v.string(),
      boardDescription: v.string(),
      email: v.string(),
      role: v.union(v.literal("participant"), v.literal("viewer")),
      invitedByName: v.string(),
      invitedByEmail: v.string(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const emailLower = normalizeEmail(args.email);
    const invites = await ctx.db
      .query("boardInvites")
      .withIndex("by_email", (q) => q.eq("emailLower", emailLower))
      .collect();

    const results = [];
    for (const invite of invites) {
      if (invite.status !== "pending") continue;
      const board = await ctx.db.get(invite.boardId);
      if (!board) continue;
      const inviter = await ctx.db.get(invite.invitedBy);
      results.push(toInviteSummary(invite, board, inviter));
    }
    return results;
  },
});

/**
 * List invites for a board (admin only)
 */
export const listForBoard = query({
  args: { boardId: v.id("boards"), userId: v.id("users") },
  returns: v.array(
    v.object({
      inviteId: v.id("boardInvites"),
      email: v.string(),
      role: v.union(v.literal("participant"), v.literal("viewer")),
      status: v.union(
        v.literal("pending"),
        v.literal("accepted"),
        v.literal("declined")
      ),
      invitedByName: v.string(),
      invitedByEmail: v.string(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    await requireBoardAdmin(ctx, args.boardId, args.userId);
    const invites = await ctx.db
      .query("boardInvites")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();

    const results = [];
    for (const invite of invites) {
      const inviter = await ctx.db.get(invite.invitedBy);
      results.push({
        inviteId: invite._id,
        email: invite.email,
        role: invite.role,
        status: invite.status,
        invitedByName: inviter?.name ?? "Unknown",
        invitedByEmail: inviter?.email ?? "",
        createdAt: invite._creationTime,
      });
    }
    return results;
  },
});

/**
 * Create a board invite
 */
export const create = mutation({
  args: {
    boardId: v.id("boards"),
    email: v.string(),
    invitedBy: v.id("users"),
    role: v.optional(v.union(v.literal("participant"), v.literal("viewer"))),
  },
  returns: v.id("boardInvites"),
  handler: async (ctx, args) => {
    await requireBoardAdmin(ctx, args.boardId, args.invitedBy);

    const emailLower = normalizeEmail(args.email);
    if (!isValidEmail(emailLower)) {
      throw new ConvexError({
        code: "INVALID_EMAIL",
        message: "Please enter a valid email address",
      });
    }

    const board = await ctx.db.get(args.boardId);
    if (!board) {
      throw new ConvexError({
        code: "BOARD_NOT_FOUND",
        message: "Board not found",
      });
    }

    const existingInvite = await ctx.db
      .query("boardInvites")
      .withIndex("by_board_and_email", (q) =>
        q.eq("boardId", args.boardId).eq("emailLower", emailLower)
      )
      .unique();

    if (existingInvite) {
      return existingInvite._id;
    }

    const users = await ctx.db.query("users").collect();
    const existingUser = users.find(
      (user: Doc<"users">) => normalizeEmail(user.email) === emailLower
    );

    if (existingUser) {
      const membership = await ctx.db
        .query("boardMembers")
        .withIndex("by_board_and_user", (q) =>
          q.eq("boardId", args.boardId).eq("userId", existingUser._id)
        )
        .unique();
      if (membership) {
        return await ctx.db.insert("boardInvites", {
          boardId: args.boardId,
          email: args.email.trim(),
          emailLower,
          invitedBy: args.invitedBy,
          role: args.role ?? "viewer",
          status: "accepted",
        });
      }
    }

    return await ctx.db.insert("boardInvites", {
      boardId: args.boardId,
      email: args.email.trim(),
      emailLower,
      invitedBy: args.invitedBy,
      role: args.role ?? "viewer",
      status: "pending",
    });
  },
});

/**
 * Accept an invite and join board
 */
export const accept = mutation({
  args: { inviteId: v.id("boardInvites"), userId: v.id("users") },
  returns: v.id("boards"),
  handler: async (ctx, args) => {
    const invite = await ctx.db.get(args.inviteId);
    if (!invite) {
      throw new ConvexError({
        code: "INVITE_NOT_FOUND",
        message: "Invite not found",
      });
    }

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError({
        code: "USER_NOT_FOUND",
        message: "User not found",
      });
    }

    const emailLower = normalizeEmail(user.email);
    if (invite.emailLower !== emailLower) {
      throw new ConvexError({
        code: "INVITE_EMAIL_MISMATCH",
        message: "This invite does not match your email",
      });
    }

    const existingMembership = await ctx.db
      .query("boardMembers")
      .withIndex("by_board_and_user", (q) =>
        q.eq("boardId", invite.boardId).eq("userId", args.userId)
      )
      .unique();

    if (!existingMembership) {
      await ctx.db.insert("boardMembers", {
        boardId: invite.boardId,
        userId: args.userId,
        role: invite.role,
        userPrefs: {},
      });
    }

    await ctx.db.patch(invite._id, { status: "accepted" });
    return invite.boardId;
  },
});

/**
 * Decline an invite
 */
export const decline = mutation({
  args: { inviteId: v.id("boardInvites"), userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const invite = await ctx.db.get(args.inviteId);
    if (!invite) return null;

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError({
        code: "USER_NOT_FOUND",
        message: "User not found",
      });
    }

    const emailLower = normalizeEmail(user.email);
    if (invite.emailLower !== emailLower) {
      throw new ConvexError({
        code: "INVITE_EMAIL_MISMATCH",
        message: "This invite does not match your email",
      });
    }

    await ctx.db.patch(invite._id, { status: "declined" });
    return null;
  },
});

/**
 * Revoke an invite (admin only)
 */
export const revoke = mutation({
  args: { inviteId: v.id("boardInvites"), userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const invite = await ctx.db.get(args.inviteId);
    if (!invite) return null;
    await requireBoardAdmin(ctx, invite.boardId, args.userId);
    await ctx.db.delete(invite._id);
    return null;
  },
});
