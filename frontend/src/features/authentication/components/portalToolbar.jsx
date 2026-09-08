import Card from "../../../components/common/card";
import SearchBar from "../../../components/common/searchBar";

function PortalToolbar({
  searchQuery = "",
  onSearchChange,
  onClearSearch,
  placeholder = "Search...",
  showingCount = 0,
  totalCount = 0,
  itemLabel = "items",
  children,
  className = "",
}) {
  return (
    <Card className={`p-4 shadow-sm animate-slide-up-1 ${className}`}>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <SearchBar
          value={searchQuery}
          onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
          onClear={onClearSearch}
          placeholder={placeholder}
          className="relative w-full sm:w-96"
        />

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="text-xs font-medium text-gray-500 self-start sm:self-center">
            Showing{" "}
            <span className="font-bold text-gray-900">{showingCount}</span> of{" "}
            <span className="font-bold text-gray-900">{totalCount}</span>{" "}
            {itemLabel}
          </div>

          {children}
        </div>
      </div>
    </Card>
  );
}

export default PortalToolbar;
