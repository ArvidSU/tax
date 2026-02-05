import { useState, useCallback } from "react";
import type { Category } from "../../../types";

interface UseCategoryFilterReturn {
  availableCategoryIds: string[];
  toggleCategory: (categoryId: string) => void;
  allowAllCategories: () => void;
  isCategoryAvailable: (categoryId: string) => boolean;
}

export function useCategoryFilter(
  rootCategories: Category[]
): UseCategoryFilterReturn {
  const [availableCategoryIds, setAvailableCategoryIds] = useState<string[]>([]);

  const toggleCategory = useCallback(
    (categoryId: string) => {
      setAvailableCategoryIds((prev) => {
        if (prev.length === 0) {
          const allRootIds = rootCategories.map((category) =>
            category._id.toString()
          );
          return allRootIds.filter((id) => id !== categoryId);
        }
        return prev.includes(categoryId)
          ? prev.filter((id) => id !== categoryId)
          : [...prev, categoryId];
      });
    },
    [rootCategories]
  );

  const allowAllCategories = useCallback(() => {
    setAvailableCategoryIds([]);
  }, []);

  const isCategoryAvailable = useCallback(
    (categoryId: string) => {
      if (availableCategoryIds.length === 0) return true;
      return availableCategoryIds.includes(categoryId);
    },
    [availableCategoryIds]
  );

  return {
    availableCategoryIds,
    toggleCategory,
    allowAllCategories,
    isCategoryAvailable,
  };
}

export type { UseCategoryFilterReturn };
