import { useCallback, useEffect, useRef, useState } from "react";
import { Slider } from "./Slider";
import "./Body.css";

interface Category {
  _id: string;
  name: string;
  description: string;
  color: string;
  order: number;
  page: number;
}

interface BodyProps {
  categories: Category[];
  allocations: Map<string, number>; // categoryId -> percentage
  currentPage: number;
  onAllocationChange: (categoryId: string, value: number) => void;
  onPageChange: (page: number) => void;
}

export function Body({
  categories,
  allocations,
  currentPage,
  onAllocationChange,
  onPageChange,
}: BodyProps) {
  const [expandedSliderId, setExpandedSliderId] = useState<string | null>(null);
  const sliderRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Filter and sort categories for current page
  const currentPageCategories = categories
    .filter((cat) => cat.page === currentPage)
    .sort((a, b) => a.order - b.order);

  // Calculate total pages
  const totalPages = Math.max(...categories.map((cat) => cat.page), 0) + 1;

  // Calculate total allocated percentage
  const totalAllocated = Array.from(allocations.values()).reduce(
    (sum, val) => sum + val,
    0
  );

  // Calculate dynamic max for each slider
  const calculateMax = useCallback(
    (categoryId: string): number => {
      const othersSum = Array.from(allocations.entries())
        .filter(([id]) => id !== categoryId)
        .reduce((sum, [, val]) => sum + val, 0);
      return 100 - othersSum;
    },
    [allocations]
  );

  // Handle slider expansion toggle
  const handleSliderClick = useCallback((categoryId: string) => {
    setExpandedSliderId((prev) => (prev === categoryId ? null : categoryId));
  }, []);

  // Auto-scroll to expanded slider
  useEffect(() => {
    if (expandedSliderId) {
      const sliderElement = sliderRefs.current.get(expandedSliderId);
      if (sliderElement) {
        // Small delay to allow expansion animation to start
        setTimeout(() => {
          sliderElement.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 50);
      }
    }
  }, [expandedSliderId]);

  // Collapse expanded slider when page changes
  // This effect resets UI state when the page prop changes - a standard pattern for derived state reset
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Resetting UI state on prop change is a valid pattern
    setExpandedSliderId(null);
  }, [currentPage]);

  // Touch event handlers for swipe navigation
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartRef.current || e.changedTouches.length !== 1) {
        touchStartRef.current = null;
        return;
      }

      const touchEnd = {
        x: e.changedTouches[0].clientX,
        y: e.changedTouches[0].clientY,
      };

      const deltaX = touchEnd.x - touchStartRef.current.x;
      const deltaY = touchEnd.y - touchStartRef.current.y;
      const minSwipeThreshold = 50;

      // Only handle horizontal swipes (more horizontal than vertical)
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeThreshold) {
        if (deltaX < 0 && currentPage < totalPages - 1) {
          // Swipe left - go to next page
          onPageChange(currentPage + 1);
        } else if (deltaX > 0 && currentPage > 0) {
          // Swipe right - go to previous page
          onPageChange(currentPage - 1);
        }
      }

      touchStartRef.current = null;
    },
    [currentPage, totalPages, onPageChange]
  );

  // Set slider ref
  const setSliderRef = useCallback(
    (categoryId: string) => (el: HTMLDivElement | null) => {
      if (el) {
        sliderRefs.current.set(categoryId, el);
      } else {
        sliderRefs.current.delete(categoryId);
      }
    },
    []
  );

  // Determine allocation status for styling
  const getAllocationStatus = (): "normal" | "warning" | "full" => {
    if (totalAllocated >= 100) return "full";
    if (totalAllocated >= 90) return "warning";
    return "normal";
  };

  const allocationStatus = getAllocationStatus();

  return (
    <div
      className="body-container"
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Allocation Summary */}
      <div className={`allocation-summary ${allocationStatus}`}>
        <div className="allocation-bar-container">
          <div
            className="allocation-bar-fill"
            style={{ width: `${Math.min(totalAllocated, 100)}%` }}
          />
        </div>
        <div className="allocation-text">
          <span className="allocation-percentage">{totalAllocated}%</span>
          <span className="allocation-label">allocated</span>
          {totalAllocated > 100 && (
            <span className="allocation-warning">Over budget!</span>
          )}
        </div>
      </div>

      {/* Sliders */}
      <div className="sliders-container">
        {currentPageCategories.map((category) => (
          <div
            key={category._id}
            ref={setSliderRef(category._id)}
            className="slider-wrapper"
          >
            <Slider
              id={category._id}
              name={category.name}
              description={category.description}
              value={allocations.get(category._id) ?? 0}
              max={calculateMax(category._id)}
              color={category.color}
              isExpanded={expandedSliderId === category._id}
              onChange={(value) => onAllocationChange(category._id, value)}
              onClick={() => handleSliderClick(category._id)}
            />
          </div>
        ))}

        {currentPageCategories.length === 0 && (
          <div className="no-categories">
            No categories on this page
          </div>
        )}
      </div>

      {/* Page Indicator Dots */}
      {totalPages > 1 && (
        <div className="page-indicators">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              className={`page-dot ${i === currentPage ? "active" : ""}`}
              onClick={() => onPageChange(i)}
              aria-label={`Go to page ${i + 1}`}
              aria-current={i === currentPage ? "page" : undefined}
            />
          ))}
        </div>
      )}

      {/* Swipe hint for mobile */}
      {totalPages > 1 && (
        <div className="swipe-hint" aria-hidden="true">
          <span>Swipe to navigate pages</span>
        </div>
      )}
    </div>
  );
}

export type { BodyProps, Category };
