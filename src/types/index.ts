import type { Id } from "../../convex/_generated/dataModel";

export interface Category {
  _id: string;
  name: string;
  description: string;
  color: string;
  order: number;
  createdBy?: string;
  page?: number;
  parentId?: string;
  depth?: number;
  hasChildren?: boolean;
}

export interface Board {
  _id: string;
  name: string;
  description: string;
  public: boolean;
  settings: BoardSettings;
}

export interface BoardSettings {
  participantsCanCreateCategories: boolean;
  undistributedStrategy: "average" | "mean" | "mirror";
  unit: string;
  symbol: string;
  symbolPosition: "prefix" | "suffix";
  minAllocation: number;
  maxAllocation: number;
}

export interface BoardMember {
  boardId: Id<"boards">;
  userId: Id<"users">;
  role: "owner" | "participant" | "viewer";
  userPrefs: {
    allocationTotal: number;
  };
}

export interface User {
  _id: Id<"users">;
  name: string;
  email: string;
}

export interface Allocation {
  categoryId: Id<"categories">;
  percentage: number;
}

export interface AllocationAggregate {
  categoryId: string;
  averagePercentage: number;
  averageAmount: number;
  totalAmount: number;
  totalResponses: number;
}

export interface Invite {
  inviteId: string;
  boardId: string;
  boardName: string;
  boardDescription?: string;
  invitedByName: string;
  role: "viewer" | "participant";
  status: "pending" | "accepted" | "declined";
  email: string;
}
