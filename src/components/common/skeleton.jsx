/**
 * Reusable Skeleton Loading Component
 *
 * Provides animated placeholders for UI elements while data is loading.
 * Supports primitive shapes, text blocks, table rows, stat cards, and
 * a conditional wrapper.
 */

// 1. Base Skeleton Primitive
export function Skeleton({
  variant = "rectangular", // 'rectangular' | 'circular' | 'text' | 'button'
  width,
  height,
  className = "",
  pulse = true,
  style = {},
  ...props
}) {
  const variantStyles = {
    text: "h-4 w-full rounded",
    circular: "rounded-full shrink-0 aspect-square",
    rectangular: "rounded-lg",
    button: "h-9 w-24 rounded-lg",
  };

  const inlineStyle = {
    ...(width ? { width: typeof width === "number" ? `${width}px` : width } : {}),
    ...(height ? { height: typeof height === "number" ? `${height}px` : height } : {}),
    ...style,
  };

  return (
    <div
      aria-hidden="true"
      style={inlineStyle}
      className={`bg-gray-200/80 ${pulse ? "animate-pulse" : ""} ${
        variantStyles[variant] || variantStyles.rectangular
      } ${className}`}
      {...props}
    />
  );
}

// 2. Multi-line Text Skeleton
export function SkeletonText({
  lines = 3,
  className = "",
  gap = "space-y-2.5",
  lastLineWidth = "w-3/5",
}) {
  return (
    <div className={`${gap} ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          variant="text"
          className={index === lines - 1 ? lastLineWidth : "w-full"}
        />
      ))}
    </div>
  );
}

// 3. Circular Avatar Skeleton
export function SkeletonAvatar({ size = "w-10 h-10", className = "" }) {
  return <Skeleton variant="circular" className={`${size} ${className}`} />;
}

// 4. Button Skeleton
export function SkeletonButton({ className = "" }) {
  return <Skeleton variant="button" className={className} />;
}

// 5. Card / Entity Card Skeleton
export function SkeletonCard({ className = "", hasHeader = true, rows = 3 }) {
  return (
    <div
      className={`bg-white rounded-2xl border border-gray-200 p-5 space-y-4 shadow-xs ${className}`}
      aria-hidden="true"
    >
      {hasHeader && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <Skeleton variant="circular" className="w-10 h-10 shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
          <Skeleton className="h-6 w-16 rounded-md" />
        </div>
      )}
      <SkeletonText lines={rows} />
      <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
    </div>
  );
}

// 6. Data Table Rows Skeleton
export function SkeletonTable({
  rows = 5,
  columns = 5,
  className = "",
  hasHeader = true,
}) {
  return (
    <div
      className={`w-full overflow-hidden rounded-xl border border-gray-200 bg-white ${className}`}
      aria-hidden="true"
    >
      {hasHeader && (
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 grid grid-flow-col auto-cols-fr gap-4">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton key={`head-${colIdx}`} className="h-4 w-3/4 bg-gray-300/80" />
          ))}
        </div>
      )}
      <div className="divide-y divide-gray-100">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div
            key={`row-${rowIdx}`}
            className="px-4 py-3.5 grid grid-flow-col auto-cols-fr gap-4 items-center"
          >
            {Array.from({ length: columns }).map((_, colIdx) => (
              <Skeleton
                key={`cell-${rowIdx}-${colIdx}`}
                className={`h-4 ${
                  colIdx === 0
                    ? "w-4/5"
                    : colIdx === columns - 1
                    ? "w-1/2"
                    : "w-3/5"
                }`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// 7. Dashboard Metric / Stat Card Skeleton
export function SkeletonMetrics({ count = 4, className = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" }) {
  return (
    <div className={className} aria-hidden="true">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={`metric-${idx}`}
          className="bg-white rounded-xl border border-gray-200 p-5 space-y-3 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton variant="circular" className="w-8 h-8" />
          </div>
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>
  );
}

// 8. Conditional Render Wrapper: renders fallback when loading is true
export function SkeletonWrapper({ loading = false, fallback, children }) {
  if (loading) {
    return fallback || <Skeleton className="h-20 w-full" />;
  }
  return children;
}

// Attach subcomponents for convenient namespaced usage: <Skeleton.Card />, <Skeleton.Text />, etc.
Skeleton.Text = SkeletonText;
Skeleton.Avatar = SkeletonAvatar;
Skeleton.Button = SkeletonButton;
Skeleton.Card = SkeletonCard;
Skeleton.Table = SkeletonTable;
Skeleton.Metrics = SkeletonMetrics;
Skeleton.Wrapper = SkeletonWrapper;

export default Skeleton;
