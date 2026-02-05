import { useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { Category } from "../../../types";

interface UseCategoriesProps {
  selectedBoardId: string | null;
  userId: string | null;
  canCreateCategories: boolean;
  availableCategoryIds: string[];
}

interface UseCategoriesReturn {
  categories: Category[];
  visibleCategories: Category[];
  rootCategories: Category[];
  currentLevelCategories: (parentId: string | null) => Category[];
  createCategory: (
    name: string,
    parentId: string | null,
    description?: string
  ) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  updateCategory: (
    categoryId: string,
    updates: { name?: string; description?: string; color?: string }
  ) => Promise<void>;
  categoryHasChildren: Set<string>;
}

export function useCategories({
  selectedBoardId,
  userId,
  canCreateCategories,
  availableCategoryIds,
}: UseCategoriesProps): UseCategoriesReturn {
  const allCategories = useQuery(
    api.categories.list,
    selectedBoardId ? { boardId: selectedBoardId as Id<"boards"> } : "skip"
  );
  const createCategoryMutation = useMutation(api.categories.create);
  const deleteCategoryMutation = useMutation(api.categories.remove);
  const updateCategoryMutation = useMutation(api.categories.update);

  const categoryById = useMemo(() => {
    const map = new Map<string, Category>();
    (allCategories ?? []).forEach((category: unknown) => {
      const cat = category as Category;
      map.set(cat._id.toString(), cat);
    });
    return map;
  }, [allCategories]);

  const rootIdByCategoryId = useMemo(() => {
    const rootMap = new Map<string, string>();
    const resolveRoot = (categoryId: string): string => {
      const cached = rootMap.get(categoryId);
      if (cached) return cached;
      const category = categoryById.get(categoryId);
      if (!category || !category.parentId) {
        rootMap.set(categoryId, categoryId);
        return categoryId;
      }
      const rootId = resolveRoot(category.parentId);
      rootMap.set(categoryId, rootId);
      return rootId;
    };

    categoryById.forEach((_, categoryId) => {
      resolveRoot(categoryId);
    });

    return rootMap;
  }, [categoryById]);

  const visibleCategories = useMemo(() => {
    if (!allCategories) return [];
    if (!availableCategoryIds || availableCategoryIds.length === 0) {
      return allCategories as Category[];
    }
    const allowedRoots = new Set(availableCategoryIds);
    return (allCategories as Category[]).filter((category) => {
      const rootId = rootIdByCategoryId.get(category._id.toString());
      return rootId ? allowedRoots.has(rootId) : false;
    });
  }, [allCategories, availableCategoryIds, rootIdByCategoryId]);

  const rootCategories = useMemo(() => {
    if (!allCategories) return [];
    return (allCategories as Category[]).filter(
      (category) => category.parentId === undefined
    );
  }, [allCategories]);

  const currentLevelCategories = useCallback(
    (parentId: string | null): Category[] => {
      return visibleCategories.filter((cat) => {
        if (!parentId) {
          return cat.parentId === undefined;
        }
        return cat.parentId === parentId;
      });
    },
    [visibleCategories]
  );

  const categoryHasChildren = useMemo(() => {
    const parents = new Set<string>();
    visibleCategories.forEach((category) => {
      if (category.parentId) {
        parents.add(category.parentId);
      }
    });
    return parents;
  }, [visibleCategories]);

  const createCategory = useCallback(
    async (
      name: string,
      parentId: string | null,
      description?: string
    ): Promise<void> => {
      if (!userId || !selectedBoardId || !canCreateCategories) return;
      await createCategoryMutation({
        boardId: selectedBoardId as Id<"boards">,
        userId: userId as Id<"users">,
        name,
        description: description?.trim() ?? "",
        parentId: parentId ? (parentId as Id<"categories">) : undefined,
      });
    },
    [createCategoryMutation, userId, selectedBoardId, canCreateCategories]
  );

  const deleteCategory = useCallback(
    async (categoryId: string): Promise<void> => {
      if (!userId || !selectedBoardId) return;
      await deleteCategoryMutation({
        boardId: selectedBoardId as Id<"boards">,
        userId: userId as Id<"users">,
        categoryId: categoryId as Id<"categories">,
      });
    },
    [deleteCategoryMutation, userId, selectedBoardId]
  );

  const updateCategory = useCallback(
    async (
      categoryId: string,
      updates: { name?: string; description?: string; color?: string }
    ): Promise<void> => {
      if (!userId || !selectedBoardId) return;
      await updateCategoryMutation({
        boardId: selectedBoardId as Id<"boards">,
        userId: userId as Id<"users">,
        categoryId: categoryId as Id<"categories">,
        ...updates,
      });
    },
    [updateCategoryMutation, userId, selectedBoardId]
  );

  return {
    categories: (allCategories as Category[]) ?? [],
    visibleCategories,
    rootCategories,
    currentLevelCategories,
    createCategory,
    deleteCategory,
    updateCategory,
    categoryHasChildren,
  };
}

export type { UseCategoriesReturn };
