import { useState, useRef, useCallback, useEffect } from "react";
import "./CategoryCombobox.css";

interface Category {
  _id: string;
  name: string;
  description?: string;
  color?: string;
}

interface CategoryComboboxProps {
  categories: Category[];
  parentId: string | null;
  onSelect: (categoryId: string | null) => void;
  onCreate: (name: string, parentId: string | null) => void;
  placeholder?: string;
}

export function CategoryCombobox({
  categories,
  parentId,
  onSelect,
  onCreate,
  placeholder = "Search or create category...",
}: CategoryComboboxProps) {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter categories based on input (case-insensitive)
  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  // Check if there's an exact match (case-insensitive)
  const exactMatch = categories.find(
    (cat) => cat.name.toLowerCase() === inputValue.toLowerCase()
  );

  // Determine if we should show "Create new" option
  const showCreateOption = inputValue.trim() !== "" && !exactMatch;

  // Calculate total options for keyboard navigation
  const totalOptions = filteredCategories.length + (showCreateOption ? 1 : 0);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setIsOpen(true);
    setHighlightedIndex(-1);
  }, []);

  // Handle input focus
  const handleInputFocus = useCallback(() => {
    setIsOpen(true);
  }, []);

  // Handle option selection
  const handleSelect = useCallback(
    (categoryId: string) => {
      onSelect(categoryId);
      const selected = categories.find((c) => c._id === categoryId);
      if (selected) {
        setInputValue(selected.name);
      }
      setIsOpen(false);
      setHighlightedIndex(-1);
    },
    [categories, onSelect]
  );

  // Handle creating new category
  const handleCreate = useCallback(() => {
    const trimmedName = inputValue.trim();
    if (trimmedName) {
      onCreate(trimmedName, parentId);
      setInputValue("");
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  }, [inputValue, parentId, onCreate]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setIsOpen(true);
          setHighlightedIndex((prev) =>
            prev < totalOptions - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case "Enter":
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < filteredCategories.length) {
            // Select highlighted category
            handleSelect(filteredCategories[highlightedIndex]._id);
          } else if (highlightedIndex === filteredCategories.length && showCreateOption) {
            // Create new category
            handleCreate();
          } else if (exactMatch) {
            // Select exact match
            handleSelect(exactMatch._id);
          } else if (inputValue.trim()) {
            // Create new if no match
            handleCreate();
          }
          break;
        case "Escape":
          setIsOpen(false);
          setHighlightedIndex(-1);
          break;
      }
    },
    [
      highlightedIndex,
      totalOptions,
      filteredCategories,
      showCreateOption,
      exactMatch,
      inputValue,
      handleSelect,
      handleCreate,
    ]
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="category-combobox" ref={containerRef}>
      <div className="combobox-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="combobox-input"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-haspopup="listbox"
        />
        <button
          type="button"
          className="combobox-toggle"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? "Close options" : "Open options"}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            className={isOpen ? "open" : ""}
          >
            <path
              d="M2 4L6 8L10 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="combobox-dropdown" role="listbox">
          {filteredCategories.length === 0 && !showCreateOption ? (
            <div className="combobox-empty">No categories found</div>
          ) : (
            <>
              {/* Existing categories */}
              {filteredCategories.map((category, index) => (
                <div
                  key={category._id}
                  className={`combobox-option ${
                    highlightedIndex === index ? "highlighted" : ""
                  } ${exactMatch?._id === category._id ? "exact-match" : ""}`}
                  onClick={() => handleSelect(category._id)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  role="option"
                  aria-selected={highlightedIndex === index}
                >
                  <span
                    className="category-color-dot"
                    style={{
                      backgroundColor: category.color || "#6b7280",
                    }}
                  />
                  <span className="category-name">{category.name}</span>
                  {exactMatch?._id === category._id && (
                    <span className="exact-match-badge">Exact match</span>
                  )}
                </div>
              ))}

              {/* Create new option */}
              {showCreateOption && (
                <div
                  className={`combobox-option create-new ${
                    highlightedIndex === filteredCategories.length
                      ? "highlighted"
                      : ""
                  }`}
                  onClick={handleCreate}
                  onMouseEnter={() =>
                    setHighlightedIndex(filteredCategories.length)
                  }
                  role="option"
                  aria-selected={highlightedIndex === filteredCategories.length}
                >
                  <span className="create-icon">+</span>
                  <span className="create-text">
                    Create &ldquo;{inputValue.trim()}&rdquo;
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export type { CategoryComboboxProps, Category };
