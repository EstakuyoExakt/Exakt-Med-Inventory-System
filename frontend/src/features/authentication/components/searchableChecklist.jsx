import { Search } from "lucide-react";

function SearchableChecklist({
  label,
  selectedCount,
  totalCount,
  items = [],
  selectedIds = [],
  onToggle,
  onSelectAll,
  onDeselectAll,
  searchTerm,
  onSearchChange,
  placeholder = "Filter items...",
  getItemKey = (item) => item.id,
  getItemLabel = (item) => item.name,
  getItemBadge = (item) => null,
  renderItem = null,
  maxHeight = "max-h-48",
  helperText,
  emptyMessage = "No matching items found.",
}) {
  const isAllSelected =
    items.length > 0 && items.every((i) => selectedIds.includes(getItemKey(i)));

  return (
    <div>
      {/* Header with Label and Select All / Deselect All */}
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
          {label}{" "}
          <span className="font-normal text-gray-500">
            ({selectedCount !== undefined ? selectedCount : selectedIds.length}
            {totalCount !== undefined ? ` of ${totalCount}` : ""}{" "}
            selected)
          </span>
        </label>
        <div className="flex items-center gap-2">
          {onSelectAll && !isAllSelected && items.length > 0 && (
            <button
              type="button"
              onClick={onSelectAll}
              className="text-[11px] text-purple-600 hover:text-purple-800 hover:underline cursor-pointer"
            >
              Select all
            </button>
          )}
          {onSelectAll && onDeselectAll && !isAllSelected && selectedIds.length > 0 && (
            <span className="text-gray-300">|</span>
          )}
          {onDeselectAll && selectedIds.length > 0 && (
            <button
              type="button"
              onClick={onDeselectAll}
              className="text-[11px] text-gray-500 hover:text-gray-700 hover:underline cursor-pointer"
            >
              Deselect all
            </button>
          )}
        </div>
      </div>

      {/* Quick Search Filter */}
      {onSearchChange && (
        <div className="relative mb-2">
          <input
            type="text"
            value={searchTerm || ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            className="input py-1.5 pl-8 text-xs"
          />
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      )}

      {/* Scrollable Checklist */}
      <div
        className={`${maxHeight} overflow-y-auto border border-gray-200 rounded-xl p-2 space-y-1 divide-y divide-gray-50 bg-gray-50/50`}
      >
        {items.length > 0 ? (
          items.map((item) => {
            const key = getItemKey(item);
            const isChecked = selectedIds.includes(key);

            if (renderItem) {
              return renderItem(item, isChecked, () => onToggle(key));
            }

            const badge = getItemBadge(item);

            return (
              <label
                key={key}
                className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                  isChecked
                    ? "bg-purple-50/80 text-purple-900 border border-purple-200/80 font-medium"
                    : "hover:bg-white text-gray-700"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggle(key)}
                    className="rounded text-purple-600 focus:ring-purple-500 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="truncate">{getItemLabel(item)}</span>
                </div>
                {badge && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-gray-200 text-gray-500 shrink-0 ml-2">
                    {badge}
                  </span>
                )}
              </label>
            );
          })
        ) : (
          <p className="text-xs text-gray-400 italic py-3 text-center">
            {emptyMessage}
          </p>
        )}
      </div>

      {helperText && (
        <p className="text-[11px] text-gray-400 mt-1">{helperText}</p>
      )}
    </div>
  );
}

export default SearchableChecklist;
