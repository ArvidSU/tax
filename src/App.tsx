import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { getSessionId } from "./utils/session";
import { PullDownSheet } from "./components/PullDownSheet";
import type { AggregateData } from "./components/PullDownSheet";
import { Body } from "./components/Body";
import type { Category } from "./components/Body";
import type { BreadcrumbItem } from "./components/Breadcrumb";
import "./App.css";

function App() {
  // 1. Session ID (from localStorage or generated)
  const [sessionId] = useState(() => getSessionId());

  // 2. Financial inputs state
  const [salary, setSalary] = useState<number>(50000);
  const [taxRate, setTaxRate] = useState<number>(25);

  // 2b. Currency and payrate settings
  const [currency, setCurrency] = useState<"USD" | "SEK" | "EUR">("USD");
  const [payrateFrequency, setPayrateFrequency] = useState<"hour" | "day" | "month" | "year">("year");

  // 2. Navigation state - which parent category we're viewing (null = root)
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);

  // 3. Allocations state (Map<categoryId, percentage>)
  const [allocations, setAllocations] = useState<Map<string, number>>(
    new Map()
  );

  // 4. Convex queries
  const allCategories = useQuery(api.categories.list);
  const distribution = useQuery(api.distributions.getBySession, { sessionId });
  const aggregatesRaw = useQuery(api.distributions.getAggregates);
  const userCount = useQuery(api.distributions.getCount);

  // Get path for breadcrumb when we have a current parent
  const currentCategoryPath = useQuery(
    api.categories.getPath,
    currentParentId ? { categoryId: currentParentId as Id<"categories"> } : "skip"
  );

  // 5. Convex mutations
  const seedCategories = useMutation(api.categories.seed);
  const upsertDistributionLevel = useMutation(api.distributions.upsertLevel);
  const createCategory = useMutation(api.categories.create);

  // Debounce timer ref
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 6. Effect to seed categories if none exist
  useEffect(() => {
    if (allCategories !== undefined && allCategories.length === 0) {
      seedCategories();
    }
  }, [allCategories, seedCategories]);

  // 7. Sync allocations from saved distribution
  // Track if we've already initialized from this distribution
  const initializedDistributionRef = useRef<string | null>(null);

  // Sync allocations from external data source (Convex)
  // This is a legitimate pattern for initializing state from an external store
  useEffect(() => {
    if (distribution !== undefined) {
      const distKey = distribution ? JSON.stringify(distribution.allocations) : 'empty';
      if (initializedDistributionRef.current !== distKey && allocations.size === 0) {
        initializedDistributionRef.current = distKey;
        if (distribution && distribution.allocations.length > 0) {
          const initialAllocations = new Map<string, number>();
          for (const allocation of distribution.allocations) {
            initialAllocations.set(allocation.categoryId, allocation.percentage);
          }
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setAllocations(initialAllocations);
        }
      }
    }
  }, [distribution, allocations.size]);

  // Build breadcrumb path from the current category path
  const breadcrumbPath: BreadcrumbItem[] = useMemo(() => {
    if (!currentCategoryPath) return [];
    return currentCategoryPath.map((cat) => ({
      id: cat._id,
      name: cat.name,
    }));
  }, [currentCategoryPath]);

  // Get categories at current level
  const currentLevelCategories = useMemo(() => {
    if (!allCategories) return [];
    return allCategories.filter((cat) => {
      if (currentParentId === null) {
        return cat.parentId === undefined;
      }
      return cat.parentId === currentParentId;
    });
  }, [allCategories, currentParentId]);

  // Transform aggregates to match PullDownSheet's expected format
  const aggregates: AggregateData[] = useMemo(() => {
    if (!aggregatesRaw || !allCategories) return [];

    interface RawAggregate {
      categoryId: string;
      averagePercentage: number;
      totalResponses: number;
    }

    // Only show aggregates for current level categories
    const currentLevelIds = new Set(currentLevelCategories.map((c) => c._id.toString()));

    return (aggregatesRaw as RawAggregate[])
      .filter((agg: RawAggregate) => currentLevelIds.has(agg.categoryId.toString()))
      .map((agg: RawAggregate) => {
        const category = (allCategories as Category[]).find(
          (c: Category) => c._id === agg.categoryId
        );
        if (!category) return null;
        return {
          categoryId: agg.categoryId,
          categoryName: category.name,
          averagePercentage: agg.averagePercentage,
          color: category.color,
        };
      })
      .filter((agg): agg is AggregateData => agg !== null);
  }, [aggregatesRaw, allCategories, currentLevelCategories]);

  // 8. Handler for allocation changes (debounced save to Convex)
  const handleAllocationChange = useCallback(
    (categoryId: string, value: number) => {
      // Optimistic update - update local state immediately
      setAllocations((prev) => {
        const next = new Map(prev);
        if (value === 0) {
          next.delete(categoryId);
        } else {
          next.set(categoryId, value);
        }
        return next;
      });

      // Debounced save to backend (300ms)
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        // Build allocations array for current level only
        // Access the latest allocations through a ref pattern without violating ESLint rules
        setAllocations((latestAllocations) => {
          const levelAllocations = currentLevelCategories
            .map((cat) => ({
              categoryId: cat._id as Id<"categories">,
              percentage: latestAllocations.get(cat._id) ?? 0,
            }))
            .filter((a) => a.percentage > 0);

          // Calculate total for current level
          const total = levelAllocations.reduce(
            (sum, a) => sum + a.percentage,
            0
          );

          // Only save if allocations sum to 100%
          if (total === 100) {
            upsertDistributionLevel({
              sessionId,
              parentId: (currentParentId ?? undefined) as Id<"categories"> | undefined,
              allocations: levelAllocations,
            });
          }

          return latestAllocations;
        });
      }, 300);
    },
    [sessionId, currentParentId, currentLevelCategories, upsertDistributionLevel]
  );

  // 9. Handler for navigation
  const handleNavigate = useCallback((categoryId: string | null) => {
    setCurrentParentId(categoryId);
  }, []);

  // 10. Handler for creating new category
  const handleCreateCategory = useCallback(
    async (name: string, parentId: string | null) => {
      await createCategory({
        name,
        parentId: parentId ? (parentId as Id<"categories">) : undefined,
      });
    },
    [createCategory]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Calculate tax amount
  const taxAmount = useMemo(() => {
    return salary * (taxRate / 100);
  }, [salary, taxRate]);

  // Loading state
  const isLoading = allCategories === undefined;

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  // 10. Render PullDownSheet and Body components
  return (
    <div className="app-container">
      <PullDownSheet
        aggregates={aggregates}
        totalUsers={userCount ?? 0}
        currentPage={0}
        totalPages={1}
        onPageChange={() => {}}
        salary={salary}
        taxRate={taxRate}
        onSalaryChange={setSalary}
        onTaxRateChange={setTaxRate}
        taxAmount={taxAmount}
        currency={currency}
        onCurrencyChange={setCurrency}
        payrateFrequency={payrateFrequency}
        onPayrateFrequencyChange={setPayrateFrequency}
      />
      <Body
        key={currentParentId ?? "root"}
        categories={allCategories as Category[]}
        allocations={allocations}
        currentParentId={currentParentId}
        breadcrumbPath={breadcrumbPath}
        onAllocationChange={handleAllocationChange}
        onNavigate={handleNavigate}
        onCreateCategory={handleCreateCategory}
        taxAmount={taxAmount}
      />
    </div>
  );
}

export default App;
