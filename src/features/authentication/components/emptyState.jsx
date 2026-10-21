import { Layers } from "lucide-react";

function EmptyState({
  icon: Icon = Layers,
  title = "No results found",
  description = "Try adjusting your search criteria.",
  actionText = "Clear Search",
  onAction = null,
  className = "",
}) {
  return (
    <div
      className={`text-center py-12 bg-white rounded-2xl border border-gray-200 p-8 ${className}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 text-gray-400 mx-auto mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      {description && (
        <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto leading-relaxed">
          {description}
        </p>
      )}
      {onAction && actionText && (
        <button
          type="button"
          onClick={onAction}
          className="btn-secondary text-xs mt-4 cursor-pointer"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
