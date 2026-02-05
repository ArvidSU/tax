import "./Loading.css";

interface LoadingProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  fullScreen?: boolean;
}

export function Loading({ message, size = "md", fullScreen = false }: LoadingProps) {
  const sizeClass = `loading-spinner--${size}`;

  const content = (
    <>
      <div className={`loading-spinner ${sizeClass}`} />
      {message && <p className="loading-message">{message}</p>}
    </>
  );

  if (fullScreen) {
    return <div className="app-loading">{content}</div>;
  }

  return <div className="loading-container">{content}</div>;
}

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ className = "", width, height }: SkeletonProps) {
  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === "number" ? `${width}px` : width;
  if (height) style.height = typeof height === "number" ? `${height}px` : height;

  return <div className={`skeleton ${className}`.trim()} style={style} />;
}

export type { LoadingProps };
