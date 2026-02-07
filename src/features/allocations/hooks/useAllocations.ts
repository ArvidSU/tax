import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { Category } from "../../../types";

interface UseAllocationsProps {
  userId: string | null;
  boardId: string | null;
  currentParentId: string | null;
  currentLevelCategories: Category[];
}

interface UseAllocationsReturn {
  allocations: Map<string, number>;
  totalAllocated: number;
  handleAllocationChange: (categoryId: string, value: number) => void;
  calculateMax: (categoryId: string) => number;
  isFullyAllocated: boolean;
}

export function useAllocations({
  userId,
  boardId,
  currentParentId,
  currentLevelCategories,
}: UseAllocationsProps): UseAllocationsReturn {
  // Store allocations in state but initialize from query data via lazy state update
  const [allocations, setAllocations] = useState<Map<string, number>>(new Map());
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastKeyRef = useRef<string>("");

  const allocationsRaw = useQuery(
    api.distributions.getByBoardAndUser,
    userId && boardId
      ? {
          userId: userId as Id<"users">,
          boardId: boardId as Id<"boards">,
        }
      : "skip"
  );

  const upsertDistributionLevel = useMutation(api.distributions.upsertLevel);

  // Use a microtask to avoid setState during render issues
  useEffect(() => {
    if (!allocationsRaw || !boardId || !userId) return;
    
    const allocationKey = `${boardId}-${userId}`;
    if (lastKeyRef.current === allocationKey) return;
    
    // Schedule state update in next tick to avoid setState-in-render warning
    const timeoutId = setTimeout(() => {
      lastKeyRef.current = allocationKey;
      const nextAllocations = new Map<string, number>();
      for (const allocation of allocationsRaw) {
        nextAllocations.set(allocation.categoryId, allocation.percentage);
      }
      setAllocations(nextAllocations);
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [allocationsRaw, boardId, userId]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const totalAllocated = currentLevelCategories.reduce((sum, cat) => {
    return sum + (allocations.get(cat._id) ?? 0);
  }, 0);

  const calculateMax = useCallback(
    (categoryId: string): number => {
      const othersSum = currentLevelCategories
        .filter((cat) => cat._id !== categoryId)
        .reduce((sum, cat) => sum + (allocations.get(cat._id) ?? 0), 0);
      return 100 - othersSum;
    },
    [currentLevelCategories, allocations]
  );

  const handleAllocationChange = useCallback(
    (categoryId: string, value: number) => {
      setAllocations((prev) => {
        const next = new Map(prev);
        if (value === 0) {
          next.delete(categoryId);
        } else {
          next.set(categoryId, value);
        }
        return next;
      });

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        if (!userId || !boardId) return;
        setAllocations((latestAllocations) => {
          const levelAllocations = currentLevelCategories
            .map((cat) => ({
              categoryId: cat._id as Id<"categories">,
              percentage: latestAllocations.get(cat._id) ?? 0,
            }))
            .filter((allocation) => allocation.percentage > 0);

          const total = levelAllocations.reduce(
            (sum, allocation) => sum + allocation.percentage,
            0
          );

          if (total === 100) {
            upsertDistributionLevel({
              boardId: boardId as Id<"boards">,
              userId: userId as Id<"users">,
              parentId: currentParentId
                ? (currentParentId as Id<"categories">)
                : undefined,
              allocations: levelAllocations,
            });
          }

          return latestAllocations;
        });
      }, 300);
    },
    [userId, boardId, currentParentId, currentLevelCategories, upsertDistributionLevel]
  );

  return {
    allocations,
    totalAllocated,
    handleAllocationChange,
    calculateMax,
    isFullyAllocated: totalAllocated >= 100,
  };
}

export type { UseAllocationsReturn };
