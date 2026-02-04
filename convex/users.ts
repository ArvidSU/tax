import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import type { Doc } from "./_generated/dataModel";

const userPublicValidator = v.object({
  _id: v.id("users"),
  _creationTime: v.number(),
  name: v.string(),
  email: v.string(),
  externalId: v.string(),
});

const toPublicUser = (user: Doc<"users">) => ({
  _id: user._id,
  _creationTime: user._creationTime,
  name: user.name,
  email: user.email,
  externalId: user.externalId,
});

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/**
 * List all users (public fields only)
 */
export const list = query({
  args: {},
  returns: v.array(userPublicValidator),
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.map(toPublicUser);
  },
});

/**
 * Get a user by Convex document ID (_id)
 */
export const get = query({
  args: { userId: v.id("users") },
  returns: v.union(userPublicValidator, v.null()),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    return user ? toPublicUser(user) : null;
  },
});

/**
 * Get a user by external ID
 */
export const getByExternalId = query({
  args: { externalId: v.string() },
  returns: v.union(userPublicValidator, v.null()),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
      .unique();
    return user ? toPublicUser(user) : null;
  },
});

/**
 * Register a new user
 */
export const register = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    secret: v.string(),
    externalId: v.optional(v.string()),
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    const normalizedEmail = normalizeEmail(args.email);
    if (!isValidEmail(normalizedEmail)) {
      throw new ConvexError({
        code: "INVALID_EMAIL",
        message: "Please enter a valid email address",
      });
    }

    const users = await ctx.db.query("users").collect();
    const existingByEmail = users.find(
      (user) => normalizeEmail(user.email) === normalizedEmail
    );

    if (existingByEmail) {
      throw new ConvexError({
        code: "EMAIL_EXISTS",
        message: "A user with this email already exists",
      });
    }

    const externalId = args.externalId ?? normalizedEmail;
    const existingByExternalId = await ctx.db
      .query("users")
      .withIndex("by_external_id", (q) => q.eq("externalId", externalId))
      .unique();

    if (existingByExternalId) {
      throw new ConvexError({
        code: "EXTERNAL_ID_EXISTS",
        message: "A user with this external ID already exists",
      });
    }

    return await ctx.db.insert("users", {
      name: args.name,
      email: normalizedEmail,
      secret: args.secret,
      externalId,
    });
  },
});

/**
 * Login with email + secret
 */
export const login = mutation({
  args: {
    email: v.string(),
    secret: v.string(),
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    const normalizedEmail = normalizeEmail(args.email);
    if (!isValidEmail(normalizedEmail)) {
      throw new ConvexError({
        code: "INVALID_EMAIL",
        message: "Please enter a valid email address",
      });
    }

    const users = await ctx.db.query("users").collect();
    const user = users.find(
      (item) => normalizeEmail(item.email) === normalizedEmail
    );

    if (!user || user.secret !== args.secret) {
      throw new ConvexError({
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or secret",
      });
    }

    return user._id;
  },
});

/**
 * Update a user's name
 */
export const updateName = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError({
        code: "USER_NOT_FOUND",
        message: "User not found",
      });
    }

    await ctx.db.patch(args.userId, { name: args.name });
    return null;
  },
});

/**
 * Update a user's email
 */
export const updateEmail = mutation({
  args: {
    userId: v.id("users"),
    email: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError({
        code: "USER_NOT_FOUND",
        message: "User not found",
      });
    }

    const normalizedEmail = normalizeEmail(args.email);
    if (!isValidEmail(normalizedEmail)) {
      throw new ConvexError({
        code: "INVALID_EMAIL",
        message: "Please enter a valid email address",
      });
    }

    const users = await ctx.db.query("users").collect();
    const existing = users.find(
      (item) => normalizeEmail(item.email) === normalizedEmail
    );

    if (existing && existing._id !== args.userId) {
      throw new ConvexError({
        code: "EMAIL_EXISTS",
        message: "A user with this email already exists",
      });
    }

    await ctx.db.patch(args.userId, { email: normalizedEmail });
    return null;
  },
});

/**
 * Update a user's secret
 */
export const updateSecret = mutation({
  args: {
    userId: v.id("users"),
    secret: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError({
        code: "USER_NOT_FOUND",
        message: "User not found",
      });
    }

    await ctx.db.patch(args.userId, { secret: args.secret });
    return null;
  },
});

/**
 * Delete a user
 */
export const remove = mutation({
  args: {
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError({
        code: "USER_NOT_FOUND",
        message: "User not found",
      });
    }

    await ctx.db.delete(args.userId);
    return null;
  },
});
