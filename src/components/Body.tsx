import { useCallback, useEffect, useRef, useState } from "react";
import { Slider } from "./Slider";
import { Breadcrumb } from "./Breadcrumb";
import type { BreadcrumbItem } from "./Breadcrumb";
import { CategoryCombobox } from "./CategoryCombobox";
import "./Body.css";

interface Category {
  _id: string;
  name: string;
  description: string;
  color: string;
  order: number;
  page?: number; // Legacy field
  parentId?: string;
  depth?: number;
  hasChildren?: boolean;
}

interface BodyProps {
  categories: Category[];
  allocations: Map<string, number>; // categoryId -> percentage
  currentParentId: string | null; // null for root level
  breadcrumbPath: BreadcrumbItem[];
  onAllocationChange: (categoryId: string, value: number) => void;
  onNavigate: (categoryId: string | null) => void;
  onCreateCategory: (name: string, parentId: string | null) => void;
  taxAmount: number; // Total tax amount for calculating dollar values
}

export function Body({
  categories,
  allocations,
  currentParentId,
  breadcrumbPath,
  onAllocationChange,
  onNavigate,
  onCreateCategory,
  taxAmount,
}: BodyProps) {
  const [expandedSliderId, setExpandedSliderId] = useState<string | null>(null);
  const sliderRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter categories for current level
  const currentLevelCategories = categories
    .filter((cat) => {
      if (currentParentId === null) {
        // Root level: categories without a parent
        return cat.parentId === undefined;
      }
      // Child level: categories whose parent matches
      return cat.parentId === currentParentId;
    })
    .sort((a, b) => a.order - b.order);

  // Calculate total allocated percentage at current level
  const totalAllocated = currentLevelCategories.reduce((sum, cat) => {
    return sum + (allocations.get(cat._id) ?? 0);
  }, 0);

  // Calculate dynamic max for each slider
  const calculateMax = useCallback(
    (categoryId: string): number => {
      const othersSum = currentLevelCategories
        .filter((cat) => cat._id !== categoryId)
        .reduce((sum, cat) => sum + (allocations.get(cat._id) ?? 0), 0);
      return 100 - othersSum;
    },
    [currentLevelCategories, allocations]
  );

  // Handle slider expansion toggle
  const handleSliderClick = useCallback((categoryId: string) => {
    setExpandedSliderId((prev) => (prev === categoryId ? null : categoryId));
  }, []);

  // Handle drill-down into a category's children
  const handleDrillDown = useCallback(
    (categoryId: string) => {
      onNavigate(categoryId);
    },
    [onNavigate]
  );

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
    <div className="body-container" ref={containerRef}>
      {/* Breadcrumb Navigation */}
      <Breadcrumb path={breadcrumbPath} onNavigate={onNavigate} />

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
          <span className="allocation-label">allocated at this level</span>
          {totalAllocated > 100 && (
            <span className="allocation-warning">Over budget!</span>
          )}
          {totalAllocated < 100 && totalAllocated > 0 && (
            <span className="allocation-remaining">
              {100 - totalAllocated}% remaining
            </span>
          )}
        </div>
      </div>

      {/* Sliders */}
      <div className="sliders-container">
        {currentLevelCategories.map((category) => (
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
              hasChildren={category.hasChildren ?? false}
              taxAmount={taxAmount}
              onChange={(value) => onAllocationChange(category._id, value)}
              onClick={() => handleSliderClick(category._id)}
              onDrillDown={() => handleDrillDown(category._id)}
            />
          </div>
        ))}

        {currentLevelCategories.length === 0 && (
          <div className="no-categories">
            No sub-categories available
          </div>
        )}

        {/* Add Category Combobox */}
        <div className="add-category-section">
          <CategoryCombobox
            categories={currentLevelCategories}
            parentId={currentParentId}
            onSelect={(categoryId) => {
              if (categoryId) {
                onNavigate(categoryId);
              }
            }}
            onCreate={onCreateCategory}
            placeholder="Add or search category..."
          />
        </div>
      </div>

      {/* Level info */}
      <div className="level-info">
        <span className="level-depth">
          Level {breadcrumbPath.length + 1} •{" "}
          {currentLevelCategories.length} categories
        </span>
      </div>
    </div>
  );
}

export type { BodyProps, Category };
