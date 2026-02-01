import "./Breadcrumb.css";

interface BreadcrumbItem {
  id: string | null; // null for root
  name: string;
}

interface BreadcrumbProps {
  path: BreadcrumbItem[];
  onNavigate: (categoryId: string | null) => void;
}

export function Breadcrumb({ path, onNavigate }: BreadcrumbProps) {
  // Always show "Home" as the root
  const fullPath: BreadcrumbItem[] = [{ id: null, name: "Home" }, ...path];

  return (
    <nav className="breadcrumb" aria-label="Category navigation">
      <ol className="breadcrumb-list">
        {fullPath.map((item, index) => {
          const isLast = index === fullPath.length - 1;
          const isClickable = !isLast;

          return (
            <li key={item.id ?? "root"} className="breadcrumb-item">
              {isClickable ? (
                <button
                  className="breadcrumb-link"
                  onClick={() => onNavigate(item.id)}
                  aria-label={`Navigate to ${item.name}`}
                >
                  {item.name}
                </button>
              ) : (
                <span className="breadcrumb-current" aria-current="page">
                  {item.name}
                </span>
              )}
              {!isLast && (
                <span className="breadcrumb-separator" aria-hidden="true">
                  ›
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export type { BreadcrumbProps, BreadcrumbItem };
