import { useCallback, useRef, useState, useEffect } from "react";
import { formatAmountWithSymbol } from "../utils/formatAmount";
import type { SymbolPosition } from "../utils/formatAmount";
import "./Slider.css";

interface SliderProps {
  id: string;
  name: string; // e.g. "Healthcare"
  description: string; // Shown when expanded
  value: number; // Current value 0-100
  max: number; // Dynamic max (controlled by parent to ensure sum ≤ 100)
  color: string; // Fill color
  isExpanded: boolean; // Whether this slider is expanded
  hasChildren: boolean; // Whether this category has sub-categories
  canAddCategories?: boolean; // Whether user can add categories (show drill-down even if no children)
  canDeleteCategory?: boolean; // Whether delete action should be shown
  canEditCategory?: boolean; // Whether edit/color actions should be shown
  allocationTotal?: number; // User's total allocation amount for absolute display
  symbol?: string; // Unit symbol for absolute display
  symbolPosition?: SymbolPosition; // Prefix or suffix symbol display
  onChange: (value: number) => void;
  onClick: () => void; // To toggle expansion
  onDrillDown?: () => void; // To navigate into sub-categories
  onDeleteCategory?: () => void; // Delete this category and descendants
  onUpdateCategory?: (updates: {
    name?: string;
    description?: string;
    color?: string;
  }) => void; // Update this category
}

export function Slider({
  id,
  name,
  description,
  value,
  max,
  color,
  isExpanded,
  hasChildren,
  canAddCategories,
  canDeleteCategory,
  canEditCategory,
  allocationTotal,
  symbol,
  symbolPosition,
  onChange,
  onClick,
  onDrillDown,
  onDeleteCategory,
  onUpdateCategory,
}: SliderProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedColor, setSelectedColor] = useState(color);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editableDescription, setEditableDescription] = useState(description);

  useEffect(() => {
    setSelectedColor(color);
  }, [color]);

  useEffect(() => {
    setEditableDescription(description);
  }, [description]);

  // Calculate value from pointer position
  const calculateValue = useCallback(
    (clientX: number): number => {
      if (!barRef.current) return value;

      const rect = barRef.current.getBoundingClientRect();
      const percentage = ((clientX - rect.left) / rect.width) * 100;

      // Clamp between 0 and max
      return Math.round(Math.max(0, Math.min(max, percentage)));
    },
    [max, value]
  );

  // Handle click for expansion toggle
  const handleBarClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Don't toggle expansion if we were dragging
      if (isDragging) return;

      // Check if clicking on handle or drill-down button - don't toggle if so
      const target = e.target as HTMLElement;
      if (
        target.classList.contains("slider-handle") ||
        target.classList.contains("slider-drill-down")
      ) {
        return;
      }

      onClick();
    },
    [isDragging, onClick]
  );

  // Handle pointer down on the drag handle
  const handleHandlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Only handle left mouse button or touch
      if (e.button !== 0 && e.pointerType === "mouse") return;

      e.preventDefault();
      e.stopPropagation();

      setIsDragging(true);
      const handleElement = e.currentTarget;
      handleElement.setPointerCapture(e.pointerId);
    },
    []
  );

  // Handle pointer move during drag
  const handleHandlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;

      e.preventDefault();
      const newValue = calculateValue(e.clientX);
      onChange(newValue);
    },
    [isDragging, calculateValue, onChange]
  );

  // Handle pointer up to end drag
  const handleHandlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;

      e.preventDefault();
      e.currentTarget.releasePointerCapture(e.pointerId);

      // Small delay to prevent click from firing
      setTimeout(() => {
        setIsDragging(false);
      }, 10);
    },
    [isDragging]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      let newValue = value;
      const step = e.shiftKey ? 10 : 1;

      switch (e.key) {
        case "ArrowRight":
        case "ArrowUp":
          e.preventDefault();
          newValue = Math.min(max, value + step);
          break;
        case "ArrowLeft":
        case "ArrowDown":
          e.preventDefault();
          newValue = Math.max(0, value - step);
          break;
        case "Home":
          e.preventDefault();
          newValue = 0;
          break;
        case "End":
          e.preventDefault();
          newValue = max;
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          onClick();
          return;
        default:
          return;
      }

      if (newValue !== value) {
        onChange(newValue);
      }
    },
    [value, max, onChange, onClick]
  );

  // Handle drill-down button click
  const handleDrillDown = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      onDrillDown?.();
    },
    [onDrillDown]
  );

  const handleDeleteCategory = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      onDeleteCategory?.();
    },
    [onDeleteCategory]
  );

  const handleEditCategory = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (!onUpdateCategory) return;
      if (!isEditingDescription) {
        setEditableDescription(description);
        setIsEditingDescription(true);
        return;
      }

      onUpdateCategory({
        description: editableDescription.trim(),
        color: selectedColor,
      });
      setIsEditingDescription(false);
    },
    [
      description,
      editableDescription,
      isEditingDescription,
      onUpdateCategory,
      selectedColor,
    ]
  );

  const handleCancelEdit = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      setEditableDescription(description);
      setIsEditingDescription(false);
    },
    [description]
  );

  const handleColorChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextColor = event.target.value;
      setSelectedColor(nextColor);
      onUpdateCategory?.({ color: nextColor });
    },
    [onUpdateCategory]
  );

  // Calculate handle position (clamped to 0-100 for display)
  const displayValue = Math.min(value, 100);
  const handlePosition = `clamp(calc(var(--slider-handle-size) / 2), ${displayValue}%, calc(100% - (var(--slider-handle-size) / 2)))`;
  const absoluteValue =
    allocationTotal !== undefined ? (value / 100) * allocationTotal : null;
  const showAbsolute = absoluteValue !== null && symbol && symbolPosition;

  return (
    <div className="slider-container">
      <div
        ref={barRef}
        className="slider-bar"
        style={{ "--slider-color": selectedColor } as React.CSSProperties}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-valuetext={`${name}: ${value}%`}
        aria-label={`${name} allocation slider`}
        aria-expanded={isExpanded}
        aria-describedby={isExpanded ? `${id}-description` : undefined}
        tabIndex={0}
        onClick={handleBarClick}
        onKeyDown={handleKeyDown}
      >
        {/* Fill bar */}
        <div
          className="slider-fill"
          style={{ width: `${displayValue}%` }}
          data-full={displayValue >= 99}
          aria-hidden="true"
        />

        {/* Content overlay */}
        <div className="slider-content">
            <span className="slider-name">{name}</span>
            <div className="slider-actions">
              <span className="slider-value">{value}%</span>
              {showAbsolute && (
                <span className="slider-amount">
                  {formatAmountWithSymbol(
                    Math.round((absoluteValue ?? 0) * 100) / 100,
                    symbol,
                    symbolPosition
                  )}
                </span>
              )}
              {(hasChildren || canAddCategories) && (
              <button
                className="slider-drill-down"
                onClick={handleDrillDown}
                aria-label={`View ${name} sub-categories`}
                title="View sub-categories"
              >
                →
              </button>
            )}
          </div>
        </div>

        {/* Draggable handle */}
        <div
          className={`slider-handle ${isDragging ? "dragging" : ""}`}
          style={{ left: handlePosition }}
          onPointerDown={handleHandlePointerDown}
          onPointerMove={handleHandlePointerMove}
          onPointerUp={handleHandlePointerUp}
          onPointerCancel={handleHandlePointerUp}
          aria-hidden="true"
        />
      </div>

      {/* Expand indicator */}
      <div
        className={`slider-expand-indicator ${isExpanded ? "expanded" : ""}`}
        aria-hidden="true"
      >
        ▼
      </div>

      {/* Description (expandable) */}
      <div
        className={`slider-description-wrapper ${isExpanded ? "expanded" : ""}`}
      >
        <div id={`${id}-description`} className="slider-description">
          {isEditingDescription ? (
            <textarea
              className="slider-description-textarea"
              value={editableDescription}
              onChange={(event) => setEditableDescription(event.target.value)}
              aria-label={`Edit ${name} description`}
              rows={3}
            />
          ) : (
            <div className="slider-description-content">{description}</div>
          )}
          <div className="slider-description-actions">
            {canEditCategory && (
              <>
                <input
                  type="color"
                  className="slider-color-picker"
                  value={selectedColor}
                  onChange={handleColorChange}
                  aria-label={`Pick color for ${name}`}
                  title="Pick category color"
                />
                <button
                  type="button"
                  className="slider-edit-button"
                  onClick={handleEditCategory}
                  aria-label={`Edit ${name} category`}
                  title={isEditingDescription ? "Save description" : "Edit description"}
                >
                  {isEditingDescription ? "Save" : "Edit"}
                </button>
                {isEditingDescription && (
                  <button
                    type="button"
                    className="slider-cancel-button"
                    onClick={handleCancelEdit}
                    aria-label={`Cancel editing ${name} description`}
                    title="Cancel editing"
                  >
                    Cancel
                  </button>
                )}
              </>
            )}
            {canDeleteCategory && (
              <button
                type="button"
                className="slider-delete-button"
                onClick={handleDeleteCategory}
                aria-label={`Delete ${name} category`}
                title="Delete category and allocations"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export type { SliderProps };
