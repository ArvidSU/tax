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

    // Validate that all category IDs exist
    for (const allocation of args.allocations) {
      const category = await ctx.db.get(allocation.categoryId);
      if (!category) {
        throw new ConvexError({
          code: "INVALID_CATEGORY",
          message: `Category ${allocation.categoryId} not found`,
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
