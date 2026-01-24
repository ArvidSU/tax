import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { getSessionId } from "./utils/session";
import { PullDownSheet } from "./components/PullDownSheet";
import type { AggregateData } from "./components/PullDownSheet";
import { Body } from "./components/Body";
import type { Category } from "./components/Body";
import "./App.css";

function App() {
  // 1. Session ID (from localStorage or generated)
  const [sessionId] = useState(() => getSessionId());

  // 2. Current page state
  const [currentPage, setCurrentPage] = useState(0);

  // 3. Allocations state (Map<categoryId, percentage>)
  const [allocations, setAllocations] = useState<Map<string, number>>(
    new Map()
  );

  // Track if we've initialized allocations from saved distribution
  const [isInitialized, setIsInitialized] = useState(false);

  // 4. Convex queries
  const categories = useQuery(api.categories.list);
  const distribution = useQuery(api.distributions.getBySession, { sessionId });
  const aggregatesRaw = useQuery(api.distributions.getAggregates);
  const userCount = useQuery(api.distributions.getCount);

  // 5. Convex mutations
  const seedCategories = useMutation(api.categories.seed);
  const upsertDistribution = useMutation(api.distributions.upsert);

  // Debounce timer ref
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 6. Effect to seed categories if none exist
  useEffect(() => {
    if (categories !== undefined && categories.length === 0) {
      seedCategories();
    }
  }, [categories, seedCategories]);

  // 7. Effect to initialize allocations from saved distribution
  // This effect legitimately initializes state from external data (Convex query) on first load
  useEffect(() => {
    if (!isInitialized && distribution !== undefined) {
      if (distribution && distribution.allocations.length > 0) {
        const initialAllocations = new Map<string, number>();
        for (const allocation of distribution.allocations) {
          initialAllocations.set(allocation.categoryId, allocation.percentage);
        }
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Legitimate one-time initialization from external data
        setAllocations(initialAllocations);
      }
      setIsInitialized(true);
    }
  }, [distribution, isInitialized]);

  // Calculate total pages from categories
  const totalPages = useMemo(() => {
    if (!categories || categories.length === 0) return 1;
    return (
      Math.max(...categories.map((cat: Category) => cat.page)) + 1
    );
  }, [categories]);

  // Transform aggregates to match PullDownSheet's expected format
  const aggregates: AggregateData[] = useMemo(() => {
    if (!aggregatesRaw || !categories) return [];

    interface RawAggregate {
      categoryId: string;
      averagePercentage: number;
      totalResponses: number;
    }

    return (aggregatesRaw as RawAggregate[])
      .map((agg: RawAggregate) => {
        const category = (categories as Category[]).find(
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
  }, [aggregatesRaw, categories]);

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
        // Build allocations array from current state plus the new change
        setAllocations((currentAllocations) => {
          const allocationArray = Array.from(currentAllocations.entries())
            .filter(([, pct]) => pct > 0)
            .map(([catId, percentage]) => ({
              categoryId: catId as Id<"categories">,
              percentage,
            }));

          // Only save if there are allocations
          if (allocationArray.length > 0) {
            upsertDistribution({
              sessionId,
              allocations: allocationArray,
            });
          }

          return currentAllocations;
        });
      }, 300);
    },
    [sessionId, upsertDistribution]
  );

  // 9. Handler for page changes
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Loading state
  const isLoading = categories === undefined;

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
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
      <Body
        categories={categories as Category[]}
        allocations={allocations}
        currentPage={currentPage}
        onAllocationChange={handleAllocationChange}
        onPageChange={handlePageChange}
      />
    </div>
  );
}

export default App;
