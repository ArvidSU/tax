import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import type { Doc } from "./_generated/dataModel";

const categoryValidator = v.object({
  _id: v.id("categories"),
  _creationTime: v.number(),
  name: v.string(),
  description: v.string(),
  color: v.string(),
  order: v.number(),
  page: v.optional(v.number()), // Legacy field
  parentId: v.optional(v.id("categories")),
  depth: v.optional(v.number()),
  hasChildren: v.optional(v.boolean()),
  boardId: v.id("boards"),
});

/**
 * List all categories for a board ordered by depth then order
 */
export const list = query({
  args: { boardId: v.id("boards") },
  returns: v.array(categoryValidator),
  handler: async (ctx, args) => {
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();
    // Sort by depth first (treating undefined as 0), then by order within each depth
    return categories.sort((a, b) => {
      const aDepth = a.depth ?? 0;
      const bDepth = b.depth ?? 0;
      if (aDepth !== bDepth) return aDepth - bDepth;
      return a.order - b.order;
    });
  },
});

/**
 * Get root categories for a board (parentId is undefined or depth is 0)
 * Handles both old schema (page-based) and new schema (depth-based)
 */
export const getRoots = query({
  args: { boardId: v.id("boards") },
  returns: v.array(categoryValidator),
  handler: async (ctx, args) => {
    // Get all categories for this board and filter for roots
    const allCategories = await ctx.db
      .query("categories")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();

    // Root categories are those without a parentId
    // For old schema (page-based), treat all as roots if no depth field
    const roots = allCategories.filter((cat) => {
      // New schema: no parentId means root
      if (cat.parentId === undefined) return true;
      return false;
    });

    return roots.sort((a, b) => a.order - b.order);
  },
});

/**
 * Get children of a specific category
 */
export const getChildren = query({
  args: { parentId: v.id("categories"), boardId: v.id("boards") },
  returns: v.array(categoryValidator),
  handler: async (ctx, args) => {
    const children = await ctx.db
      .query("categories")
      .withIndex("by_parent", (q) => q.eq("parentId", args.parentId))
      .collect();
    // Filter by boardId for security
    const filtered = children.filter((cat) => cat.boardId === args.boardId);
    return filtered.sort((a, b) => a.order - b.order);
  },
});

/**
 * Get the path from root to a specific category (for breadcrumbs)
 */
export const getPath = query({
  args: { categoryId: v.id("categories") },
  returns: v.array(categoryValidator),
  handler: async (ctx, args) => {
    const path: Doc<"categories">[] = [];
    let current = await ctx.db.get(args.categoryId);

    while (current) {
      path.unshift(current);
      current = current.parentId ? await ctx.db.get(current.parentId) : null;
    }

    return path;
  },
});

/**
 * Get a single category by ID
 */
export const get = query({
  args: { categoryId: v.id("categories") },
  returns: v.union(categoryValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.categoryId);
  },
});




/**
 * Seed initial categories if the table is empty
 */
// export const seed = mutation({
//   args: {},
//   returns: v.null(),
//   handler: async (ctx) => {
//     // Check if categories already exist
//     const existing = await ctx.db.query("categories").first();
//     if (existing) {
//       return null;
//     }

//     // Helper to insert a category and return its ID
//     const insertCategory = async (
//       name: string,
//       description: string,
//       color: string,
//       order: number,
//       parentId: Id<"categories"> | undefined,
//       depth: number,
//     ): Promise<Id<"categories">> => {
//       return await ctx.db.insert("categories", {
//         name,
//         description,
//         color,
//         order,
//         parentId,
//         depth,
//       });
//     };

//     // ROOT CATEGORIES (depth 0)

//     // 1. Healthcare
//     const healthcareId = await insertCategory(
//       "Healthcare",
//       "Funds Medicare, Medicaid, and public health programs. Currently represents about 25% of federal spending, covering health insurance for elderly, disabled, and low-income Americans.",
//       "#ef4444",
//       0,
//       undefined,
//       0,
//       true
//     );

//     // 2. Education
//     const educationId = await insertCategory(
//       "Education",
//       "Supports K-12 schools, higher education grants, and student loans. Federal education spending accounts for roughly 4% of the budget, funding programs like Pell Grants and Title I.",
//       "#3b82f6",
//       1,
//       undefined,
//       0,
//       true
//     );

//     // 3. Infrastructure
//     const infrastructureId = await insertCategory(
//       "Infrastructure",
//       "Maintains and builds roads, bridges, airports, and public transit. Infrastructure spending has historically been around 2-3% of the budget, though recent legislation has increased investment.",
//       "#f97316",
//       2,
//       undefined,
//       0,
//       true
//     );

//     // 4. Defense
//     const defenseId = await insertCategory(
//       "Defense",
//       "Funds the military, veterans' benefits, and national security. Defense spending comprises approximately 13% of the federal budget, making it one of the largest discretionary categories.",
//       "#6b7280",
//       3,
//       undefined,
//       0,
//       true
//     );

//     // 5. Social Security
//     const socialSecurityId = await insertCategory(
//       "Social Security",
//       "Provides retirement, disability, and survivor benefits. As the largest federal program at about 21% of spending, it supports over 65 million Americans including retirees and disabled individuals.",
//       "#8b5cf6",
//       4,
//       undefined,
//       0,
//       true
//     );

//     // 6. Environment
//     const environmentId = await insertCategory(
//       "Environment",
//       "Funds the EPA, conservation programs, and climate initiatives. Environmental spending represents about 1% of the budget, covering pollution control, wildlife protection, and clean energy research.",
//       "#22c55e",
//       5,
//       undefined,
//       0,
//       true
//     );

//     // 7. Science & Research
//     const scienceId = await insertCategory(
//       "Science & Research",
//       "Supports NASA, NIH, NSF, and other research agencies. Science funding accounts for roughly 2% of the budget, driving innovation in medicine, technology, and space exploration.",
//       "#06b6d4",
//       6,
//       undefined,
//       0,
//       true
//     );

//     // 8. Arts & Culture
//     const artsId = await insertCategory(
//       "Arts & Culture",
//       "Supports the NEA, NEH, museums, and cultural programs. Arts funding represents less than 0.1% of the budget but preserves cultural heritage and supports creative industries across America.",
//       "#ec4899",
//       7,
//       undefined,
//       0,
//       true
//     );

//     // HEALTHCARE CHILDREN (depth 1)
//     const medicareId = await insertCategory(
//       "Medicare",
//       "Federal health insurance program for people 65 and older, and some younger people with disabilities.",
//       "#ef4444",
//       0,
//       healthcareId,
//       1,
//       true
//     );
//     const medicaidId = await insertCategory(
//       "Medicaid",
//       "Joint federal and state program providing health coverage for low-income individuals and families.",
//       "#dc2626",
//       1,
//       healthcareId,
//       1,
//       true
//     );
//     const publicHealthId = await insertCategory(
//       "Public Health",
//       "CDC, NIH disease prevention, and community health programs.",
//       "#b91c1c",
//       2,
//       healthcareId,
//       1,
//       true
//     );

//     // MEDICARE CHILDREN (depth 2)
//     await insertCategory(
//       "Hospital Insurance",
//       "Medicare Part A covering inpatient hospital stays, skilled nursing, and hospice care.",
//       "#ef4444",
//       0,
//       medicareId,
//       2,
//       false
//     );
//     await insertCategory(
//       "Medical Insurance",
//       "Medicare Part B covering doctor visits, outpatient care, and preventive services.",
//       "#f87171",
//       1,
//       medicareId,
//       2,
//       false
//     );
//     await insertCategory(
//       "Prescription Drugs",
//       "Medicare Part D providing prescription drug coverage for seniors.",
//       "#fca5a5",
//       2,
//       medicareId,
//       2,
//       false
//     );

//     // MEDICAID CHILDREN (depth 2)
//     await insertCategory(
//       "Children's Health",
//       "CHIP and Medicaid coverage for children and pregnant women.",
//       "#dc2626",
//       0,
//       medicaidId,
//       2,
//       false
//     );
//     await insertCategory(
//       "Disabled Adults",
//       "Medicaid coverage for adults with disabilities requiring long-term care.",
//       "#ef4444",
//       1,
//       medicaidId,
//       2,
//       false
//     );
//     await insertCategory(
//       "Elderly Care",
//       "Medicaid funding for nursing homes and home-based care for low-income seniors.",
//       "#f87171",
//       2,
//       medicaidId,
//       2,
//       false
//     );

//     // PUBLIC HEALTH CHILDREN (depth 2)
//     await insertCategory(
//       "Disease Control",
//       "CDC programs for infectious disease monitoring, prevention, and outbreak response.",
//       "#b91c1c",
//       0,
//       publicHealthId,
//       2,
//       false
//     );
//     await insertCategory(
//       "Mental Health",
//       "SAMHSA programs for substance abuse and mental health services.",
//       "#991b1b",
//       1,
//       publicHealthId,
//       2,
//       false
//     );
//     await insertCategory(
//       "Rural Health",
//       "Programs supporting healthcare access in rural and underserved communities.",
//       "#7f1d1d",
//       2,
//       publicHealthId,
//       2,
//       false
//     );

//     // EDUCATION CHILDREN (depth 1)
//     const k12Id = await insertCategory(
//       "K-12 Education",
//       "Federal support for elementary and secondary schools, including Title I grants for disadvantaged students.",
//       "#3b82f6",
//       0,
//       educationId,
//       1,
//       true
//     );
//     const higherEdId = await insertCategory(
//       "Higher Education",
//       "Pell Grants, student loans, and support for colleges and universities.",
//       "#2563eb",
//       1,
//       educationId,
//       1,
//       true
//     );
//     const specialEdId = await insertCategory(
//       "Special Education",
//       "IDEA grants and programs supporting students with disabilities.",
//       "#1d4ed8",
//       2,
//       educationId,
//       1,
//       true
//     );

//     // K-12 EDUCATION CHILDREN (depth 2)
//     await insertCategory(
//       "Title I Grants",
//       "Funding for schools with high percentages of low-income students.",
//       "#3b82f6",
//       0,
//       k12Id,
//       2,
//       false
//     );
//     await insertCategory(
//       "Teacher Quality",
//       "Programs to recruit, train, and retain high-quality teachers.",
//       "#60a5fa",
//       1,
//       k12Id,
//       2,
//       false
//     );
//     await insertCategory(
//       "School Nutrition",
//       "National School Lunch Program and breakfast programs for students.",
//       "#93c5fd",
//       2,
//       k12Id,
//       2,
//       false
//     );

//     // HIGHER EDUCATION CHILDREN (depth 2)
//     await insertCategory(
//       "Pell Grants",
//       "Need-based grants for low-income undergraduate students.",
//       "#2563eb",
//       0,
//       higherEdId,
//       2,
//       false
//     );
//     await insertCategory(
//       "Student Loans",
//       "Federal student loan programs and loan forgiveness initiatives.",
//       "#3b82f6",
//       1,
//       higherEdId,
//       2,
//       false
//     );
//     await insertCategory(
//       "Research Grants",
//       "Federal funding for university research and academic facilities.",
//       "#60a5fa",
//       2,
//       higherEdId,
//       2,
//       false
//     );

//     // SPECIAL EDUCATION CHILDREN (depth 2)
//     await insertCategory(
//       "Early Intervention",
//       "Services for infants and toddlers with developmental delays.",
//       "#1d4ed8",
//       0,
//       specialEdId,
//       2,
//       false
//     );
//     await insertCategory(
//       "School Age Services",
//       "Special education and related services for school-age children.",
//       "#3b82f6",
//       1,
//       specialEdId,
//       2,
//       false
//     );
//     await insertCategory(
//       "Transition Programs",
//       "Support for students with disabilities transitioning to adulthood.",
//       "#60a5fa",
//       2,
//       specialEdId,
//       2,
//       false
//     );

//     // INFRASTRUCTURE CHILDREN (depth 1)
//     const transportationId = await insertCategory(
//       "Transportation",
//       "Roads, bridges, highways, airports, and public transit systems.",
//       "#f97316",
//       0,
//       infrastructureId,
//       1,
//       true
//     );
//     const communicationId = await insertCategory(
//       "Communications",
//       "Broadband expansion, telecommunications infrastructure, and internet connectivity.",
//       "#ea580c",
//       1,
//       infrastructureId,
//       1,
//       true
//     );
//     await insertCategory(
//       "Utilities",
//       "Water, sewage, and electrical grid infrastructure.",
//       "#c2410c",
//       2,
//       infrastructureId,
//       1,
//       false
//     );

//     // TRANSPORTATION CHILDREN (depth 2)
//     await insertCategory(
//       "Highways & Roads",
//       "Construction and maintenance of interstate highways and federal roads.",
//       "#f97316",
//       0,
//       transportationId,
//       2,
//       false
//     );
//     await insertCategory(
//       "Rail",
//       "Amtrak funding, high-speed rail projects, and freight rail infrastructure.",
//       "#fb923c",
//       1,
//       transportationId,
//       2,
//       false
//     );
//     await insertCategory(
//       "Aviation",
//       "Airport improvements, air traffic control, and FAA operations.",
//       "#fdba74",
//       2,
//       transportationId,
//       2,
//       false
//     );
//     await insertCategory(
//       "Public Transit",
//       "Buses, subways, light rail, and other mass transit systems.",
//       "#fed7aa",
//       3,
//       transportationId,
//       2,
//       false
//     );

//     // COMMUNICATIONS CHILDREN (depth 2)
//     await insertCategory(
//       "Broadband",
//       "Fiber optic networks and rural broadband expansion programs.",
//       "#ea580c",
//       0,
//       communicationId,
//       2,
//       false
//     );
//     await insertCategory(
//       "5G Networks",
//       "Next-generation wireless infrastructure and spectrum allocation.",
//       "#f97316",
//       1,
//       communicationId,
//       2,
//       false
//     );

//     // DEFENSE CHILDREN (depth 1)
//     const militaryOpsId = await insertCategory(
//       "Military Operations",
//       "Active duty forces, equipment, and operational readiness.",
//       "#6b7280",
//       0,
//       defenseId,
//       1,
//       true
//     );
//     const veteransId = await insertCategory(
//       "Veterans Benefits",
//       "Healthcare, disability compensation, and education benefits for veterans.",
//       "#4b5563",
//       1,
//       defenseId,
//       1,
//       true
//     );
//     await insertCategory(
//       "Defense Research",
//       "DARPA and military technology development.",
//       "#374151",
//       2,
//       defenseId,
//       1,
//       false
//     );

//     // MILITARY OPERATIONS CHILDREN (depth 2)
//     await insertCategory(
//       "Army",
//       "Active Army personnel, equipment, and operations.",
//       "#6b7280",
//       0,
//       militaryOpsId,
//       2,
//       false
//     );
//     await insertCategory(
//       "Navy & Marines",
//       "Naval operations, fleet maintenance, and Marine Corps forces.",
//       "#9ca3af",
//       1,
//       militaryOpsId,
//       2,
//       false
//     );
//     await insertCategory(
//       "Air Force & Space",
//       "Air operations, aircraft procurement, and Space Force activities.",
//       "#d1d5db",
//       2,
//       militaryOpsId,
//       2,
//       false
//     );
//     await insertCategory(
//       "Cyber Operations",
//       "Cyber defense, information warfare, and digital security.",
//       "#4b5563",
//       3,
//       militaryOpsId,
//       2,
//       false
//     );

//     // VETERANS BENEFITS CHILDREN (depth 2)
//     await insertCategory(
//       "VA Healthcare",
//       "Medical care and hospital services for veterans through VA facilities.",
//       "#4b5563",
//       0,
//       veteransId,
//       2,
//       false
//     );
//     await insertCategory(
//       "Disability Compensation",
//       "Monthly payments to veterans with service-connected disabilities.",
//       "#6b7280",
//       1,
//       veteransId,
//       2,
//       false
//     );
//     await insertCategory(
//       "GI Bill Education",
//       "Education benefits, tuition assistance, and vocational training.",
//       "#9ca3af",
//       2,
//       veteransId,
//       2,
//       false
//     );
//     await insertCategory(
//       "Housing Benefits",
//       "VA home loans and housing assistance programs for veterans.",
//       "#d1d5db",
//       3,
//       veteransId,
//       2,
//       false
//     );

//     // SOCIAL SECURITY CHILDREN (depth 1)
//     const retirementId = await insertCategory(
//       "Retirement Benefits",
//       "Monthly benefits for retired workers based on their earnings history.",
//       "#8b5cf6",
//       0,
//       socialSecurityId,
//       1,
//       true
//     );
//     const disabilityId = await insertCategory(
//       "Disability Insurance",
//       "Benefits for workers who become disabled and cannot work.",
//       "#7c3aed",
//       1,
//       socialSecurityId,
//       1,
//       true
//     );
//     const survivorId = await insertCategory(
//       "Survivor Benefits",
//       "Benefits for families of deceased workers.",
//       "#6d28d9",
//       2,
//       socialSecurityId,
//       1,
//       true
//     );

//     // RETIREMENT BENEFITS CHILDREN (depth 2)
//     await insertCategory(
//       "Old-Age Benefits",
//       "Retirement payments for workers who paid into Social Security.",
//       "#8b5cf6",
//       0,
//       retirementId,
//       2,
//       false
//     );
//     await insertCategory(
//       "Spousal Benefits",
//       "Benefits for spouses and dependents of retired workers.",
//       "#a78bfa",
//       1,
//       retirementId,
//       2,
//       false
//     );

//     // DISABILITY BENEFITS CHILDREN (depth 2)
//     await insertCategory(
//       "SSDI Payments",
//       "Social Security Disability Insurance payments to disabled workers.",
//       "#7c3aed",
//       0,
//       disabilityId,
//       2,
//       false
//     );
//     await insertCategory(
//       "Work Incentives",
//       "Programs encouraging disabled individuals to return to work.",
//       "#a78bfa",
//       1,
//       disabilityId,
//       2,
//       false
//     );

//     // SURVIVOR BENEFITS CHILDREN (depth 2)
//     await insertCategory(
//       "Widow Benefits",
//       "Monthly payments to surviving spouses of deceased workers.",
//       "#6d28d9",
//       0,
//       survivorId,
//       2,
//       false
//     );
//     await insertCategory(
//       "Child Benefits",
//       "Payments to children of deceased or disabled workers.",
//       "#8b5cf6",
//       1,
//       survivorId,
//       2,
//       false
//     );

//     // ENVIRONMENT CHILDREN (depth 1)
//     const conservationId = await insertCategory(
//       "Conservation",
//       "National parks, wildlife refuges, and land preservation.",
//       "#22c55e",
//       0,
//       environmentId,
//       1,
//       true
//     );
//     const cleanEnergyId = await insertCategory(
//       "Clean Energy",
//       "Renewable energy research and clean energy tax incentives.",
//       "#16a34a",
//       1,
//       environmentId,
//       1,
//       true
//     );
//     const pollutionId = await insertCategory(
//       "Pollution Control",
//       "EPA enforcement, air and water quality monitoring.",
//       "#15803d",
//       2,
//       environmentId,
//       1,
//       true
//     );

//     // CONSERVATION CHILDREN (depth 2)
//     await insertCategory(
//       "National Parks",
//       "Operations and maintenance of national parks and monuments.",
//       "#22c55e",
//       0,
//       conservationId,
//       2,
//       false
//     );
//     await insertCategory(
//       "Wildlife Protection",
//       "Endangered species programs and wildlife habitat preservation.",
//       "#4ade80",
//       1,
//       conservationId,
//       2,
//       false
//     );
//     await insertCategory(
//       "Land Management",
//       "Bureau of Land Management and forest service operations.",
//       "#86efac",
//       2,
//       conservationId,
//       2,
//       false
//     );

//     // CLEAN ENERGY CHILDREN (depth 2)
//     await insertCategory(
//       "Solar Energy",
//       "Solar panel research, development, and deployment programs.",
//       "#16a34a",
//       0,
//       cleanEnergyId,
//       2,
//       false
//     );
//     await insertCategory(
//       "Wind Power",
//       "Wind energy research and offshore wind development.",
//       "#22c55e",
//       1,
//       cleanEnergyId,
//       2,
//       false
//     );
//     await insertCategory(
//       "Grid Modernization",
//       "Smart grid technology and electrical infrastructure upgrades.",
//       "#4ade80",
//       2,
//       cleanEnergyId,
//       2,
//       false
//     );

//     // POLLUTION CONTROL CHILDREN (depth 2)
//     await insertCategory(
//       "Air Quality",
//       "EPA programs monitoring and reducing air pollution emissions.",
//       "#15803d",
//       0,
//       pollutionId,
//       2,
//       false
//     );
//     await insertCategory(
//       "Water Protection",
//       "Clean Water Act enforcement and water quality monitoring.",
//       "#16a34a",
//       1,
//       pollutionId,
//       2,
//       false
//     );
//     await insertCategory(
//       "Hazardous Waste",
//       "Superfund sites cleanup and hazardous waste management.",
//       "#22c55e",
//       2,
//       pollutionId,
//       2,
//       false
//     );

//     // SCIENCE & RESEARCH CHILDREN (depth 1)
//     await insertCategory(
//       "Space Exploration",
//       "NASA operations, satellite programs, and space research initiatives.",
//       "#06b6d4",
//       0,
//       scienceId,
//       1,
//       false
//     );
//     await insertCategory(
//       "Medical Research",
//       "NIH funding for disease research, clinical trials, and medical breakthroughs.",
//       "#0891b2",
//       1,
//       scienceId,
//       1,
//       false
//     );
//     await insertCategory(
//       "Technology Research",
//       "NSF grants, computer science research, and emerging technology development.",
//       "#0e7490",
//       2,
//       scienceId,
//       1,
//       false
//     );
//     await insertCategory(
//       "Energy Research",
//       "Department of Energy labs, renewable energy research, and nuclear research.",
//       "#155e75",
//       3,
//       scienceId,
//       1,
//       false
//     );

//     // ARTS & CULTURE CHILDREN (depth 1)
//     const museumsId = await insertCategory(
//       "Museums",
//       "Smithsonian Institution and federal museum support.",
//       "#ec4899",
//       0,
//       artsId,
//       1,
//       true
//     );
//     const librariesId = await insertCategory(
//       "Libraries",
//       "Library of Congress and federal library programs.",
//       "#db2777",
//       1,
//       artsId,
//       1,
//       true
//     );
//     const artsGrantsId = await insertCategory(
//       "Arts Grants",
//       "NEA and NEH grants for artists and humanities scholars.",
//       "#be185d",
//       2,
//       artsId,
//       1,
//       true
//     );

//     // MUSEUMS CHILDREN (depth 2)
//     await insertCategory(
//       "Smithsonian",
//       "Smithsonian museums, research centers, and educational programs.",
//       "#ec4899",
//       0,
//       museumsId,
//       2,
//       false
//     );
//     await insertCategory(
//       "Historic Sites",
//       "Preservation and operation of national historic landmarks and sites.",
//       "#f472b6",
//       1,
//       museumsId,
//       2,
//       false
//     );
//     await insertCategory(
//       "Exhibitions",
//       "Traveling exhibits, educational displays, and public programs.",
//       "#f9a8d4",
//       2,
//       museumsId,
//       2,
//       false
//     );

//     // LIBRARIES CHILDREN (depth 2)
//     await insertCategory(
//       "Library of Congress",
//       "National library collections, archives, and research services.",
//       "#db2777",
//       0,
//       librariesId,
//       2,
//       false
//     );
//     await insertCategory(
//       "Public Libraries",
//       "Federal support for public library systems and services.",
//       "#ec4899",
//       1,
//       librariesId,
//       2,
//       false
//     );
//     await insertCategory(
//       "Digital Archives",
//       "Digital preservation, online collections, and access programs.",
//       "#f472b6",
//       2,
//       librariesId,
//       2,
//       false
//     );

//     // ARTS GRANTS CHILDREN (depth 2)
//     await insertCategory(
//       "Visual Arts",
//       "NEA grants supporting painters, sculptors, and visual artists.",
//       "#be185d",
//       0,
//       artsGrantsId,
//       2,
//       false
//     );
//     await insertCategory(
//       "Performing Arts",
//       "Funding for theater, dance, music, and live performance.",
//       "#db2777",
//       1,
//       artsGrantsId,
//       2,
//       false
//     );
//     await insertCategory(
//       "Humanities",
//       "NEH support for history, literature, philosophy, and cultural studies.",
//       "#ec4899",
//       2,
//       artsGrantsId,
//       2,
//       false
//     );

//     return null;
//   },
// });


/**
 * Create a new category
 */
export const create = mutation({
  args: {
    boardId: v.id("boards"),
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    parentId: v.optional(v.id("categories")),
  },
  returns: v.id("categories"),
  handler: async (ctx, args) => {
    const board = await ctx.db.get(args.boardId);
    if (!board) {
      throw new ConvexError({
        code: "BOARD_NOT_FOUND",
        message: "Board not found",
      });
    }

    const membership = await ctx.db
      .query("boardMembers")
      .withIndex("by_board_and_user", (q) =>
        q.eq("boardId", args.boardId).eq("userId", args.userId)
      )
      .unique();

    if (!membership) {
      throw new ConvexError({
        code: "NOT_AUTHORIZED",
        message: "You are not a member of this board",
      });
    }

    if (
      membership.role === "viewer" ||
      (membership.role === "participant" &&
        !board.settings.participantsCanCreateCategories)
    ) {
      throw new ConvexError({
        code: "NOT_AUTHORIZED",
        message: "You are not allowed to create categories on this board",
      });
    }

    // Determine depth based on parent
    let depth = 0;
    if (args.parentId) {
      const parent = await ctx.db.get(args.parentId);
      if (parent) {
        depth = (parent.depth ?? 0) + 1;
      }
    }

    // Get the highest order for siblings to place new category at the end
    const siblings = await ctx.db
      .query("categories")
      .withIndex("by_parent", (q) =>
        q.eq("parentId", args.parentId ?? undefined)
      )
      .collect();

    const maxOrder = siblings.reduce((max, cat) => Math.max(max, cat.order), -1);

    // Generate a color if not provided
    const colors = [
      "#ef4444", "#3b82f6", "#f97316", "#6b7280",
      "#8b5cf6", "#22c55e", "#06b6d4", "#ec4899",
    ];
    const color = args.color ?? colors[Math.floor(Math.random() * colors.length)];

    // Create the category
    const categoryId = await ctx.db.insert("categories", {
      name: args.name,
      description: args.description ?? "",
      color,
      order: maxOrder + 1,
      parentId: args.parentId,
      depth,
      boardId: args.boardId,
    });

    return categoryId;
  },
});

/**
 * Get categories that can be siblings (for creating at same level)
 */
export const getSiblings = query({
  args: {
    parentId: v.optional(v.id("categories")),
    boardId: v.id("boards"),
  },
  returns: v.array(categoryValidator),
  handler: async (ctx, args) => {
    const siblings = await ctx.db
      .query("categories")
      .withIndex("by_parent", (q) =>
        q.eq("parentId", args.parentId ?? undefined)
      )
      .collect();

    // Filter by boardId for security
    const filtered = siblings.filter((cat) => cat.boardId === args.boardId);
    return filtered.sort((a, b) => a.order - b.order);
  },
});

/**
 * Internal mutation to seed categories
 */
// export const _seed = internalMutation({
//   args: {},
//   returns: v.null(),
//   handler: async (ctx) => {
//     // Same logic as public seed - check and insert
//     const existing = await ctx.db.query("categories").first();
//     if (existing) {
//       return null;
//     }

//     // For brevity, we'll use the same structure as the public seed
//     // In a real app, you might want to share the logic or use a helper
//     // This is called from dev scripts, not from frontend
//     const insertCategory = async (
//       name: string,
//       description: string,
//       color: string,
//       order: number,
//       parentId: Id<"categories"> | undefined,
//       depth: number,
//     ): Promise<Id<"categories">> => {
//       return await ctx.db.insert("categories", {
//         name,
//         description,
//         color,
//         order,
//         parentId,
//         depth,
//       });
//     };

//     // ROOT CATEGORIES
//     const healthcareId = await insertCategory(
//       "Healthcare",
//       "Funds Medicare, Medicaid, and public health programs.",
//       "#ef4444",
//       0,
//       undefined,
//       0,
//       true
//     );

//     const educationId = await insertCategory(
//       "Education",
//       "Supports K-12 schools, higher education grants, and student loans.",
//       "#3b82f6",
//       1,
//       undefined,
//       0,
//       true
//     );

//     const infrastructureId = await insertCategory(
//       "Infrastructure",
//       "Maintains and builds roads, bridges, airports, and public transit.",
//       "#f97316",
//       2,
//       undefined,
//       0,
//       true
//     );

//     await insertCategory(
//       "Defense",
//       "Funds the military, veterans' benefits, and national security.",
//       "#6b7280",
//       3,
//       undefined,
//       0,
//       false
//     );

//     // Healthcare children
//     await insertCategory(
//       "Medicare",
//       "Federal health insurance for people 65+.",
//       "#ef4444",
//       0,
//       healthcareId,
//       1,
//       false
//     );
//     await insertCategory(
//       "Medicaid",
//       "Health coverage for low-income individuals.",
//       "#dc2626",
//       1,
//       healthcareId,
//       1,
//       false
//     );

//     // Education children
//     await insertCategory(
//       "K-12 Education",
//       "Federal support for elementary and secondary schools.",
//       "#3b82f6",
//       0,
//       educationId,
//       1,
//       false
//     );
//     await insertCategory(
//       "Higher Education",
//       "Pell Grants and student loans.",
//       "#2563eb",
//       1,
//       educationId,
//       1,
//       false
//     );

//     // Infrastructure children
//     const transportationId = await insertCategory(
//       "Transportation",
//       "Roads, bridges, highways, and public transit.",
//       "#f97316",
//       0,
//       infrastructureId,
//       1,
//       true
//     );

//     // Transportation children (depth 2)
//     await insertCategory(
//       "Highways",
//       "Interstate highways and federal roads.",
//       "#f97316",
//       0,
//       transportationId,
//       2,
//       false
//     );
//     await insertCategory(
//       "Rail",
//       "Amtrak and rail infrastructure.",
//       "#fb923c",
//       1,
//       transportationId,
//       2,
//       false
//     );

//     return null;
//   },
// });

/**
 * Clear all categories (for development only)
 */
export const clearAll = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const categories = await ctx.db.query("categories").collect();
    for (const category of categories) {
      await ctx.db.delete(category._id);
    }
    return null;
  },
});
