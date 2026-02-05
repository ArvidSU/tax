import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Hierarchical resource categories
  categories: defineTable({
    name: v.string(), // e.g., "Healthcare", "Transportation"
    description: v.string(), // Description shown when slider expands
    color: v.string(), // Color for the slider fill
    order: v.number(), // Display order within same parent
    parentId: v.optional(v.id("categories")), // null/undefined for root categories
    depth: v.number(), // 0 for root, 1 for first level children, etc.
    boardId: v.id("boards"), // Board this category belongs to
    createdBy: v.optional(v.id("users")), // Creator user id (for delete permissions)
  }).index("by_parent", ["parentId"])
    .index("by_board", ["boardId"]),

  // User resource allocations
  allocations: defineTable({
    userId: v.id("users"),
    boardId: v.id("boards"),
    categoryId: v.id("categories"),
    percentage: v.number(),
  }).index("by_board_user", ["boardId", "userId"]),

  // Boards
  boards: defineTable({
    name: v.string(),
    description: v.string(),
    public: v.boolean(),
    settings: v.object({
      participantsCanCreateCategories: v.boolean(),
      undistributedStrategy: v.union(
        v.literal("average"),
        v.literal("mean"),
        v.literal("mirror")
      ),
      unit: v.string(),
      symbol: v.string(),
    }),
  }),

  // Board members
  boardMembers: defineTable({
    boardId: v.id("boards"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("participant"), v.literal("viewer")),
    userPrefs: v.optional(v.record(v.string(), v.any())),
  }).index("by_board", ["boardId"])
    .index("by_user", ["userId"])
    .index("by_board_and_user", ["boardId", "userId"]),

  // Board invites
  boardInvites: defineTable({
    boardId: v.id("boards"),
    email: v.string(),
    emailLower: v.string(),
    invitedBy: v.id("users"),
    role: v.union(v.literal("participant"), v.literal("viewer")),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined")
    ),
  })
    .index("by_board", ["boardId"])
    .index("by_email", ["emailLower"])
    .index("by_board_and_email", ["boardId", "emailLower"]),

  // Users
  users: defineTable({
    name: v.string(),
    email: v.string(),
    secret: v.string(),
    externalId: v.string(), // ID from Clerk/Auth0
  }).index("by_external_id", ["externalId"]),
});
