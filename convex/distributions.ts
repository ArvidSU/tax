import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";

const allocationInputValidator = v.object({
  categoryId: v.id("categories"),
  percentage: v.number(),
});

const allocationEntryValidator = v.object({
  categoryId: v.id("categories"),
  percentage: v.number(),
});

/**
 * Get allocations for a specific board + user
 */
export const getByBoardAndUser = query({
  args: {
    boardId: v.id("boards"),
    userId: v.id("users"),
  },
  returns: v.array(allocationEntryValidator),
  handler: async (ctx, args) => {
    const allocations = await ctx.db
      .query("allocations")
      .withIndex("by_board_user", (q) =>
        q.eq("boardId", args.boardId).eq("userId", args.userId)
      )
      .collect();

    return allocations.map((allocation) => ({
      categoryId: allocation.categoryId,
      percentage: allocation.percentage,
    }));
  },
});

/**
 * Upsert allocations at a single category level for a board + user
 */
export const upsertLevel = mutation({
  args: {
    boardId: v.id("boards"),
    userId: v.id("users"),
    parentId: v.optional(v.id("categories")),
    allocations: v.array(allocationInputValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (const allocation of args.allocations) {
      if (allocation.percentage < 0 || allocation.percentage > 100) {
        throw new ConvexError({
          code: "INVALID_PERCENTAGE",
          message: "Percentage must be between 0 and 100",
        });
      }
    }

    const allCategories = await ctx.db.query("categories").collect();
    const categoryById = new Map(
      allCategories.map((category) => [category._id.toString(), category])
    );

    const categoriesAtLevel = allCategories.filter((category) => {
      if (!args.parentId) {
        return category.parentId === undefined;
      }
      return category.parentId?.toString() === args.parentId?.toString();
    });

    const categoryIdsAtLevel = new Set(
      categoriesAtLevel.map((category) => category._id.toString())
    );

    for (const allocation of args.allocations) {
      const category = categoryById.get(allocation.categoryId.toString());
      if (!category) {
        throw new ConvexError({
          code: "INVALID_CATEGORY",
          message: `Category ${allocation.categoryId} not found`,
        });
      }

      const categoryParent = category.parentId?.toString() ?? undefined;
      const expectedParent = args.parentId?.toString() ?? undefined;
      if (categoryParent !== expectedParent) {
        throw new ConvexError({
          code: "PARENT_MISMATCH",
          message: `Category ${category.name} belongs to different parent`,
        });
      }
    }

    const sum = args.allocations.reduce((total, allocation) => {
      return total + allocation.percentage;
    }, 0);

    if (Math.abs(sum - 100) > 0.01) {
      throw new ConvexError({
        code: "INVALID_ALLOCATION_SUM",
        message: `Allocations must sum to 100%, got ${sum}%`,
      });
    }

    const existing = await ctx.db
      .query("allocations")
      .withIndex("by_board_user", (q) =>
        q.eq("boardId", args.boardId).eq("userId", args.userId)
      )
      .collect();

    for (const allocation of existing) {
      if (categoryIdsAtLevel.has(allocation.categoryId.toString())) {
        await ctx.db.delete(allocation._id);
      }
    }

    for (const allocation of args.allocations) {
      if (allocation.percentage === 0) continue;
      await ctx.db.insert("allocations", {
        boardId: args.boardId,
        userId: args.userId,
        categoryId: allocation.categoryId as Id<"categories">,
        percentage: allocation.percentage,
      });
    }

    return null;
  },
});

/**
 * Get aggregate allocations for a board at a specific level
 */
export const getAggregatesByBoardAndParent = query({
  args: {
    boardId: v.id("boards"),
    parentId: v.optional(v.id("categories")),
  },
  returns: v.array(
    v.object({
      categoryId: v.id("categories"),
      averagePercentage: v.number(),
      totalResponses: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const allCategories = await ctx.db.query("categories").collect();
    const categoriesAtLevel = allCategories.filter((category) => {
      if (!args.parentId) {
        return category.parentId === undefined;
      }
      return category.parentId?.toString() === args.parentId?.toString();
    });

    const categoryIds = new Set(
      categoriesAtLevel.map((category) => category._id.toString())
    );

    const allocations = await ctx.db
      .query("allocations")
      .filter((q) => q.eq(q.field("boardId"), args.boardId))
      .collect();

    if (allocations.length === 0) {
      return [];
    }

    const totals: Record<string, { sum: number; count: number }> = {};

    for (const allocation of allocations) {
      const categoryId = allocation.categoryId.toString();
      if (!categoryIds.has(categoryId)) continue;
      if (!totals[categoryId]) {
        totals[categoryId] = { sum: 0, count: 0 };
      }
      totals[categoryId].sum += allocation.percentage;
      totals[categoryId].count += 1;
    }

    return Object.entries(totals).map(([categoryId, { sum, count }]) => ({
      categoryId: categoryId as Id<"categories">,
      averagePercentage: Math.round((sum / count) * 100) / 100,
      totalResponses: count,
    }));
  },
});
