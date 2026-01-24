import { useCallback, useEffect, useRef, useState } from "react";
import "./PullDownSheet.css";

interface AggregateData {
  categoryId: string;
  categoryName: string;
  averagePercentage: number;
  color: string;
}

interface PullDownSheetProps {
  aggregates: AggregateData[];
  totalUsers: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function PullDownSheet({
  aggregates,
  totalUsers,
  currentPage,
  totalPages,
  onPageChange,
}: PullDownSheetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number>(0);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);

  const COLLAPSED_HEIGHT = 80;
  const EXPANDED_HEIGHT_VH = 60;

  // Calculate the current sheet position based on state and drag
  const getSheetTop = useCallback(() => {
    const expandedHeight = (window.innerHeight * EXPANDED_HEIGHT_VH) / 100;
    
    if (isDragging) {
      const basePosition = isExpanded 
        ? 0 
        : -(expandedHeight - COLLAPSED_HEIGHT);
      return basePosition + dragOffset;
    }
    
    return isExpanded ? 0 : -(expandedHeight - COLLAPSED_HEIGHT);
  }, [isExpanded, isDragging, dragOffset]);

  // Toggle expanded state
  const toggleExpanded = useCallback(() => {
    if (!isDragging) {
      setIsExpanded((prev) => !prev);
    }
  }, [isDragging]);

  // Handle drag start on the handle bar
  const handleDragStart = useCallback((clientY: number) => {
    setIsDragging(true);
    dragStartY.current = clientY;
    setDragOffset(0);
  }, []);

  // Handle drag move
  const handleDragMove = useCallback(
    (clientY: number) => {
      if (!isDragging) return;
      
      const deltaY = clientY - dragStartY.current;
      const expandedHeight = (window.innerHeight * EXPANDED_HEIGHT_VH) / 100;
      const maxOffset = expandedHeight - COLLAPSED_HEIGHT;
      
      if (isExpanded) {
        // When expanded, can only drag up (collapse)
        setDragOffset(Math.max(-maxOffset, Math.min(0, deltaY)));
      } else {
        // When collapsed, can only drag down (expand)
        setDragOffset(Math.min(maxOffset, Math.max(0, deltaY)));
      }
    },
    [isDragging, isExpanded]
  );

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;
    
    const expandedHeight = (window.innerHeight * EXPANDED_HEIGHT_VH) / 100;
    const threshold = (expandedHeight - COLLAPSED_HEIGHT) / 3;
    
    if (isExpanded) {
      // If dragged up more than threshold, collapse
      if (dragOffset < -threshold) {
        setIsExpanded(false);
      }
    } else {
      // If dragged down more than threshold, expand
      if (dragOffset > threshold) {
        setIsExpanded(true);
      }
    }
    
    setIsDragging(false);
    setDragOffset(0);
  }, [isDragging, isExpanded, dragOffset]);

  // Pointer event handlers for handle
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      handleDragStart(e.clientY);
    },
    [handleDragStart]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      handleDragMove(e.clientY);
    },
    [handleDragMove]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.releasePointerCapture(e.pointerId);
      handleDragEnd();
    },
    [handleDragEnd]
  );

  // Touch event handlers for horizontal swipe in content area
  const handleContentTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    }
  }, []);

  const handleContentTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (e.changedTouches.length !== 1) return;
      
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const deltaX = touchEndX - touchStartX.current;
      const deltaY = touchEndY - touchStartY.current;
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
    },
    [currentPage, totalPages, onPageChange]
  );

  // Handle click on handle bar (toggle when not dragging)
  const handleClick = useCallback(() => {
    // Only toggle if we didn't significantly drag
    if (Math.abs(dragOffset) < 5) {
      toggleExpanded();
    }
  }, [dragOffset, toggleExpanded]);

  // Calculate the highest average percentage for scaling
  const maxPercentage = Math.max(...aggregates.map((a) => a.averagePercentage), 1);

  // Close sheet when clicking outside (optional behavior)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        // Optionally collapse when clicking outside
        // setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isExpanded]);

  // Calculate current sheet top for inline style
  const sheetTop = getSheetTop();
  const expandedHeight = (typeof window !== "undefined" ? window.innerHeight : 800) * EXPANDED_HEIGHT_VH / 100;

  return (
    <div
      ref={sheetRef}
      className={`pulldown-sheet ${isExpanded ? "expanded" : "collapsed"} ${isDragging ? "dragging" : ""}`}
      style={{
        top: `${sheetTop}px`,
        height: `${expandedHeight}px`,
        transition: isDragging ? "none" : "top 200ms cubic-bezier(0.2, 0.8, 0.2, 1)",
      }}
    >
      {/* Sheet Content */}
      <div 
        className="pulldown-content"
        onTouchStart={handleContentTouchStart}
        onTouchEnd={handleContentTouchEnd}
      >
        {/* Collapsed Summary View */}
        <div className="pulldown-summary">
          <div className="summary-text">
            <span className="summary-title">See how others are allocating</span>
            <span className="summary-stats">
              {totalUsers} participant{totalUsers !== 1 ? "s" : ""}
            </span>
          </div>
          {aggregates.length > 0 && (
            <div className="summary-preview">
              {aggregates.slice(0, 3).map((agg) => (
                <div
                  key={agg.categoryId}
                  className="preview-dot"
                  style={{ backgroundColor: agg.color }}
                  title={`${agg.categoryName}: ${agg.averagePercentage.toFixed(1)}%`}
                />
              ))}
              {aggregates.length > 3 && (
                <span className="preview-more">+{aggregates.length - 3}</span>
              )}
            </div>
          )}
        </div>

        {/* Expanded Chart View */}
        {isExpanded && (
          <div className="pulldown-expanded">
            <h3 className="expanded-title">Average allocations</h3>
            <div className="chart-container">
              {aggregates.length === 0 ? (
                <div className="no-data">No aggregate data available</div>
              ) : (
                aggregates.map((agg) => (
                  <div key={agg.categoryId} className="chart-row">
                    <div className="chart-label">{agg.categoryName}</div>
                    <div className="chart-bar-container">
                      <div
                        className="chart-bar"
                        style={{
                          width: `${(agg.averagePercentage / maxPercentage) * 100}%`,
                          backgroundColor: agg.color,
                        }}
                      />
                    </div>
                    <div className="chart-value">
                      {agg.averagePercentage.toFixed(1)}%
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Handle Bar */}
      <div
        ref={handleRef}
        className="pulldown-handle"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleClick}
        role="button"
        aria-expanded={isExpanded}
        aria-label={isExpanded ? "Collapse sheet" : "Expand sheet"}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleExpanded();
          }
        }}
      >
        <div className="handle-grip" />
      </div>

      {/* Page Indicator Dots */}
      {totalPages > 1 && (
        <div className="pulldown-page-indicators">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              className={`pulldown-page-dot ${i === currentPage ? "active" : ""}`}
              onClick={() => onPageChange(i)}
              aria-label={`Go to page ${i + 1}`}
              aria-current={i === currentPage ? "page" : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export type { PullDownSheetProps, AggregateData };
