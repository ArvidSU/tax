import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Hierarchical tax categories
  categories: defineTable({
    name: v.string(), // e.g., "Healthcare", "Transportation"
    description: v.string(), // Description shown when slider expands
    color: v.string(), // Color for the slider fill
    order: v.number(), // Display order within same parent
    // Legacy field - kept for backwards compatibility during migration
    page: v.optional(v.number()),
    // New hierarchical fields
    parentId: v.optional(v.id("categories")), // null/undefined for root categories
    depth: v.optional(v.number()), // 0 for root, 1 for first level children, etc.
    hasChildren: v.optional(v.boolean()), // true if this category has sub-categories
  })
    .index("by_parent", ["parentId"])
    .index("by_depth", ["depth"]),

  // User tax distributions
  distributions: defineTable({
    sessionId: v.string(), // Anonymous session identifier
    allocations: v.array(
      v.object({
        categoryId: v.id("categories"),
        percentage: v.number(), // 0-100 (percentage within parent context)
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_session", ["sessionId"]),
});
