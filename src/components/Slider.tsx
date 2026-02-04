import { useCallback, useRef, useState } from "react";
import "./Slider.css";

interface SliderProps {
  id: string;
  name: string; // e.g., "Healthcare"
  description: string; // Shown when expanded
  value: number; // Current value 0-100
  max: number; // Dynamic max (controlled by parent to ensure sum ≤ 100)
  color: string; // Fill color
  isExpanded: boolean; // Whether this slider is expanded
  hasChildren: boolean; // Whether this category has sub-categories
  onChange: (value: number) => void;
  onClick: () => void; // To toggle expansion
  onDrillDown?: () => void; // To navigate into sub-categories
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
  onChange,
  onClick,
  onDrillDown,
}: SliderProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

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

  // Handle pointer down on the track (not handle)
  const handleBarPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Only handle left mouse button or touch
      if (e.button !== 0 && e.pointerType === "mouse") return;

      // Check if clicking on handle or drill-down button - don't process bar click if so
      const target = e.target as HTMLElement;
      if (
        target.classList.contains("slider-handle") ||
        target.classList.contains("slider-drill-down")
      ) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const newValue = calculateValue(e.clientX);
      onChange(newValue);
    },
    [calculateValue, onChange]
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

  // Calculate handle position (clamped to 0-100 for display)
  const displayValue = Math.min(value, 100);
  const handlePosition = `calc(${displayValue}% - ${displayValue > 50 ? 10 : -10}px)`;

  return (
    <div className="slider-container">
      <div
        ref={barRef}
        className="slider-bar"
        style={{ "--slider-color": color } as React.CSSProperties}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-valuetext={`${name}: ${value}%`}
        aria-label={`${name} allocation slider`}
        aria-expanded={isExpanded}
        aria-describedby={isExpanded ? `${id}-description` : undefined}
        tabIndex={0}
        onPointerDown={handleBarPointerDown}
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
              {hasChildren && (
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
          {description}
        </div>
      </div>
    </div>
  );
}

export type { SliderProps };
