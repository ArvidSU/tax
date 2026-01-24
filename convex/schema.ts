import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Predefined tax categories
  categories: defineTable({
    name: v.string(), // e.g., "Healthcare", "Education"
    description: v.string(), // Description shown when slider expands
    color: v.string(), // Color for the slider fill
    order: v.number(), // Display order within a page
    page: v.number(), // Which page/set this category belongs to (0, 1, 2...)
  })
    .index("by_page", ["page"])
    .index("by_page_and_order", ["page", "order"]),

  // User tax distributions
  distributions: defineTable({
    sessionId: v.string(), // Anonymous session identifier
    allocations: v.array(
      v.object({
        categoryId: v.id("categories"),
        percentage: v.number(), // 0-100
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_session", ["sessionId"]),
});
