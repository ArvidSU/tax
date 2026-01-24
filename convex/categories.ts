import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

const categoryValidator = v.object({
  _id: v.id("categories"),
  _creationTime: v.number(),
  name: v.string(),
  description: v.string(),
  color: v.string(),
  order: v.number(),
  page: v.number(),
});

/**
 * List all categories ordered by page then order
 */
export const list = query({
  args: {},
  returns: v.array(categoryValidator),
  handler: async (ctx) => {
    const categories = await ctx.db.query("categories").collect();
    // Sort by page first, then by order within each page
    return categories.sort((a, b) => {
      if (a.page !== b.page) return a.page - b.page;
      return a.order - b.order;
    });
  },
});

/**
 * Get categories for a specific page
 */
export const getByPage = query({
  args: { page: v.number() },
  returns: v.array(categoryValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("categories")
      .withIndex("by_page_and_order", (q) => q.eq("page", args.page))
      .collect();
  },
});

/**
 * Seed initial categories if the table is empty
 */
export const seed = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Check if categories already exist
    const existing = await ctx.db.query("categories").first();
    if (existing) {
      return null;
    }

    const categories = [
      // Page 0: Core Government Services
      {
        name: "Healthcare",
        description:
          "Funds Medicare, Medicaid, and public health programs. Currently represents about 25% of federal spending, covering health insurance for elderly, disabled, and low-income Americans.",
        color: "#ef4444", // red
        order: 0,
        page: 0,
      },
      {
        name: "Education",
        description:
          "Supports K-12 schools, higher education grants, and student loans. Federal education spending accounts for roughly 4% of the budget, funding programs like Pell Grants and Title I.",
        color: "#3b82f6", // blue
        order: 1,
        page: 0,
      },
      {
        name: "Infrastructure",
        description:
          "Maintains and builds roads, bridges, airports, and public transit. Infrastructure spending has historically been around 2-3% of the budget, though recent legislation has increased investment.",
        color: "#f97316", // orange
        order: 2,
        page: 0,
      },
      {
        name: "Defense",
        description:
          "Funds the military, veterans' benefits, and national security. Defense spending comprises approximately 13% of the federal budget, making it one of the largest discretionary categories.",
        color: "#6b7280", // gray
        order: 3,
        page: 0,
      },

      // Page 1: Social Programs & Safety
      {
        name: "Social Security",
        description:
          "Provides retirement, disability, and survivor benefits. As the largest federal program at about 21% of spending, it supports over 65 million Americans including retirees and disabled individuals.",
        color: "#8b5cf6", // purple
        order: 0,
        page: 1,
      },
      {
        name: "Environment",
        description:
          "Funds the EPA, conservation programs, and climate initiatives. Environmental spending represents about 1% of the budget, covering pollution control, wildlife protection, and clean energy research.",
        color: "#22c55e", // green
        order: 1,
        page: 1,
      },
      {
        name: "Science & Research",
        description:
          "Supports NASA, NIH, NSF, and other research agencies. Science funding accounts for roughly 2% of the budget, driving innovation in medicine, technology, and space exploration.",
        color: "#06b6d4", // cyan
        order: 2,
        page: 1,
      },
      {
        name: "Public Safety",
        description:
          "Funds federal law enforcement, courts, and emergency response. This includes the FBI, federal courts, FEMA, and grants to local police departments, representing about 2% of spending.",
        color: "#eab308", // yellow
        order: 3,
        page: 1,
      },

      // Page 2: Additional Categories
      {
        name: "Arts & Culture",
        description:
          "Supports the NEA, NEH, museums, and cultural programs. Arts funding represents less than 0.1% of the budget but preserves cultural heritage and supports creative industries across America.",
        color: "#ec4899", // pink
        order: 0,
        page: 2,
      },
      {
        name: "Foreign Aid",
        description:
          "Provides humanitarian assistance and international development. Foreign aid accounts for about 1% of the budget, supporting diplomacy, global health initiatives, and disaster relief worldwide.",
        color: "#14b8a6", // teal
        order: 1,
        page: 2,
      },
      {
        name: "Debt Repayment",
        description:
          "Pays interest on the national debt. Interest payments consume about 8% of the budget and are projected to grow, limiting funds available for other programs and investments.",
        color: "#64748b", // slate
        order: 2,
        page: 2,
      },
    ];

    for (const category of categories) {
      await ctx.db.insert("categories", category);
    }

    return null;
  },
});

/**
 * Internal mutation to seed categories (for use in initialization scripts)
 */
export const _seed = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Same logic as public seed
    const existing = await ctx.db.query("categories").first();
    if (existing) {
      return null;
    }

    const categories = [
      {
        name: "Healthcare",
        description:
          "Funds Medicare, Medicaid, and public health programs. Currently represents about 25% of federal spending, covering health insurance for elderly, disabled, and low-income Americans.",
        color: "#ef4444",
        order: 0,
        page: 0,
      },
      {
        name: "Education",
        description:
          "Supports K-12 schools, higher education grants, and student loans. Federal education spending accounts for roughly 4% of the budget, funding programs like Pell Grants and Title I.",
        color: "#3b82f6",
        order: 1,
        page: 0,
      },
      {
        name: "Infrastructure",
        description:
          "Maintains and builds roads, bridges, airports, and public transit. Infrastructure spending has historically been around 2-3% of the budget, though recent legislation has increased investment.",
        color: "#f97316",
        order: 2,
        page: 0,
      },
      {
        name: "Defense",
        description:
          "Funds the military, veterans' benefits, and national security. Defense spending comprises approximately 13% of the federal budget, making it one of the largest discretionary categories.",
        color: "#6b7280",
        order: 3,
        page: 0,
      },
      {
        name: "Social Security",
        description:
          "Provides retirement, disability, and survivor benefits. As the largest federal program at about 21% of spending, it supports over 65 million Americans including retirees and disabled individuals.",
        color: "#8b5cf6",
        order: 0,
        page: 1,
      },
      {
        name: "Environment",
        description:
          "Funds the EPA, conservation programs, and climate initiatives. Environmental spending represents about 1% of the budget, covering pollution control, wildlife protection, and clean energy research.",
        color: "#22c55e",
        order: 1,
        page: 1,
      },
      {
        name: "Science & Research",
        description:
          "Supports NASA, NIH, NSF, and other research agencies. Science funding accounts for roughly 2% of the budget, driving innovation in medicine, technology, and space exploration.",
        color: "#06b6d4",
        order: 2,
        page: 1,
      },
      {
        name: "Public Safety",
        description:
          "Funds federal law enforcement, courts, and emergency response. This includes the FBI, federal courts, FEMA, and grants to local police departments, representing about 2% of spending.",
        color: "#eab308",
        order: 3,
        page: 1,
      },
      {
        name: "Arts & Culture",
        description:
          "Supports the NEA, NEH, museums, and cultural programs. Arts funding represents less than 0.1% of the budget but preserves cultural heritage and supports creative industries across America.",
        color: "#ec4899",
        order: 0,
        page: 2,
      },
      {
        name: "Foreign Aid",
        description:
          "Provides humanitarian assistance and international development. Foreign aid accounts for about 1% of the budget, supporting diplomacy, global health initiatives, and disaster relief worldwide.",
        color: "#14b8a6",
        order: 1,
        page: 2,
      },
      {
        name: "Debt Repayment",
        description:
          "Pays interest on the national debt. Interest payments consume about 8% of the budget and are projected to grow, limiting funds available for other programs and investments.",
        color: "#64748b",
        order: 2,
        page: 2,
      },
    ];

    for (const category of categories) {
      await ctx.db.insert("categories", category);
    }

    return null;
  },
});
