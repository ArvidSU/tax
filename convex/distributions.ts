import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";

const allocationValidator = v.object({
  categoryId: v.id("categories"),
  percentage: v.number(),
});

const distributionValidator = v.object({
  _id: v.id("distributions"),
  _creationTime: v.number(),
  sessionId: v.string(),
  allocations: v.array(allocationValidator),
  createdAt: v.number(),
  updatedAt: v.number(),
});

/**
 * Get distribution for a specific session
 */
export const getBySession = query({
  args: { sessionId: v.string() },
  returns: v.union(distributionValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("distributions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .unique();
  },
});

/**
 * Create or update a distribution for a session
 * Validates that allocations at each level (same parent) sum to 100%
 */
export const upsert = mutation({
  args: {
    sessionId: v.string(),
    allocations: v.array(allocationValidator),
  },
  returns: v.id("distributions"),
  handler: async (ctx, args) => {
    // Validate that all percentages are between 0 and 100
    for (const allocation of args.allocations) {
      if (allocation.percentage < 0 || allocation.percentage > 100) {
        throw new ConvexError({
          code: "INVALID_PERCENTAGE",
          message: "Percentage must be between 0 and 100",
        });
      }
    }

    // Validate that all category IDs exist and group by parent
    const allocationsByParent: Map<string, number[]> = new Map();

    for (const allocation of args.allocations) {
      const category = await ctx.db.get(allocation.categoryId);
      if (!category) {
        throw new ConvexError({
          code: "INVALID_CATEGORY",
          message: `Category ${allocation.categoryId} not found`,
        });
      }

      // Group allocations by parent ID (use "root" for root categories)
      const parentKey = category.parentId?.toString() ?? "root";

      if (!allocationsByParent.has(parentKey)) {
        allocationsByParent.set(parentKey, []);
      }
      allocationsByParent.get(parentKey)!.push(allocation.percentage);
    }

    // Validate that allocations at each level sum to 100%
    for (const [parentKey, percentages] of allocationsByParent) {
      const sum = percentages.reduce((a, b) => a + b, 0);
      // Allow some floating point tolerance
      if (Math.abs(sum - 100) > 0.01) {
        throw new ConvexError({
          code: "INVALID_ALLOCATION_SUM",
          message: `Allocations for level "${parentKey}" must sum to 100%, got ${sum}%`,
        });
      }
    }

    const now = Date.now();

    // Check if distribution already exists for this session
    const existing = await ctx.db
      .query("distributions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (existing) {
      // Update existing distribution
      await ctx.db.patch(existing._id, {
        allocations: args.allocations,
        updatedAt: now,
      });
      return existing._id;
    }

    // Create new distribution
    return await ctx.db.insert("distributions", {
      sessionId: args.sessionId,
      allocations: args.allocations,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Partial upsert - updates allocations for a specific parent level only
 * This allows saving partial progress without requiring all levels to sum to 100%
 */
export const upsertLevel = mutation({
  args: {
    sessionId: v.string(),
    parentId: v.optional(v.id("categories")), // undefined for root level
    allocations: v.array(allocationValidator),
  },
  returns: v.id("distributions"),
  handler: async (ctx, args) => {
    // Validate percentages
    for (const allocation of args.allocations) {
      if (allocation.percentage < 0 || allocation.percentage > 100) {
        throw new ConvexError({
          code: "INVALID_PERCENTAGE",
          message: "Percentage must be between 0 and 100",
        });
      }
    }

    // Validate that all categories belong to the specified parent
    for (const allocation of args.allocations) {
      const category = await ctx.db.get(allocation.categoryId);
      if (!category) {
        throw new ConvexError({
          code: "INVALID_CATEGORY",
          message: `Category ${allocation.categoryId} not found`,
        });
      }

      // Check parent matches
      const categoryParent = category.parentId?.toString() ?? undefined;
      const expectedParent = args.parentId?.toString() ?? undefined;
      if (categoryParent !== expectedParent) {
        throw new ConvexError({
          code: "PARENT_MISMATCH",
          message: `Category ${category.name} belongs to different parent`,
        });
      }
    }

    // Validate that allocations sum to 100%
    const sum = args.allocations.reduce((a, b) => a + b.percentage, 0);
    if (Math.abs(sum - 100) > 0.01) {
      throw new ConvexError({
        code: "INVALID_ALLOCATION_SUM",
        message: `Allocations must sum to 100%, got ${sum}%`,
      });
    }

    const now = Date.now();

    // Get existing distribution
    const existing = await ctx.db
      .query("distributions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    // Get current allocations
    const currentAllocations = existing?.allocations ?? [];

    // Get all categories at this level to know which ones to replace
    const categoriesAtLevel = args.parentId
      ? await ctx.db
          .query("categories")
          .withIndex("by_parent", (q) => q.eq("parentId", args.parentId))
          .collect()
      : await ctx.db
          .query("categories")
          .withIndex("by_depth", (q) => q.eq("depth", 0))
          .collect();

    const categoryIdsAtLevel = new Set(
      categoriesAtLevel.map((c) => c._id.toString())
    );

    // Filter out old allocations for this level
    const filteredAllocations = currentAllocations.filter(
      (a) => !categoryIdsAtLevel.has(a.categoryId.toString())
    );

    // Add new allocations
    const newAllocations = [...filteredAllocations, ...args.allocations];

    if (existing) {
      await ctx.db.patch(existing._id, {
        allocations: newAllocations,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("distributions", {
      sessionId: args.sessionId,
      allocations: newAllocations,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Calculate average percentages across all users for each category
 */
export const getAggregates = query({
  args: {},
  returns: v.array(
    v.object({
      categoryId: v.id("categories"),
      averagePercentage: v.number(),
      totalResponses: v.number(),
    })
  ),
  handler: async (ctx) => {
    // Get all distributions
    const distributions = await ctx.db.query("distributions").collect();

    if (distributions.length === 0) {
      return [];
    }

    // Aggregate percentages by category
    const categoryTotals: Record<string, { sum: number; count: number }> = {};

    for (const distribution of distributions) {
      for (const allocation of distribution.allocations) {
        const categoryIdStr = allocation.categoryId;
        if (!categoryTotals[categoryIdStr]) {
          categoryTotals[categoryIdStr] = { sum: 0, count: 0 };
        }
        categoryTotals[categoryIdStr].sum += allocation.percentage;
        categoryTotals[categoryIdStr].count += 1;
      }
    }

    // Calculate averages and format response
    const aggregates = Object.entries(categoryTotals).map(
      ([categoryId, { sum, count }]) => ({
        categoryId: categoryId as Id<"categories">,
        averagePercentage: Math.round((sum / count) * 100) / 100,
        totalResponses: count,
      })
    );

    return aggregates;
  },
});

/**
 * Get aggregates for a specific parent level
 */
export const getAggregatesByParent = query({
  args: { parentId: v.optional(v.id("categories")) },
  returns: v.array(
    v.object({
      categoryId: v.id("categories"),
      averagePercentage: v.number(),
      totalResponses: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    // Get categories at this level
    const categoriesAtLevel = args.parentId
      ? await ctx.db
          .query("categories")
          .withIndex("by_parent", (q) => q.eq("parentId", args.parentId))
          .collect()
      : await ctx.db
          .query("categories")
          .withIndex("by_depth", (q) => q.eq("depth", 0))
          .collect();

    const categoryIds = new Set(categoriesAtLevel.map((c) => c._id.toString()));

    // Get all distributions
    const distributions = await ctx.db.query("distributions").collect();

    if (distributions.length === 0) {
      return [];
    }

    // Aggregate only for categories at this level
    const categoryTotals: Record<string, { sum: number; count: number }> = {};

    for (const distribution of distributions) {
      for (const allocation of distribution.allocations) {
        const categoryIdStr = allocation.categoryId.toString();
        if (!categoryIds.has(categoryIdStr)) continue;

        if (!categoryTotals[categoryIdStr]) {
          categoryTotals[categoryIdStr] = { sum: 0, count: 0 };
        }
        categoryTotals[categoryIdStr].sum += allocation.percentage;
        categoryTotals[categoryIdStr].count += 1;
      }
    }

    // Calculate averages
    const aggregates = Object.entries(categoryTotals).map(
      ([categoryId, { sum, count }]) => ({
        categoryId: categoryId as Id<"categories">,
        averagePercentage: Math.round((sum / count) * 100) / 100,
        totalResponses: count,
      })
    );

    return aggregates;
  },
});

/**
 * Get total count of distributions
 */
export const getCount = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const distributions = await ctx.db.query("distributions").collect();
    return distributions.length;
  },
});
