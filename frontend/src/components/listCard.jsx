function ListCard({
  title,
  subTitle,
  action,
  className = "animate-slide-up-1",
  children,
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
}) {
  const indexOfFirstItem =
    currentPage && itemsPerPage ? (currentPage - 1) * itemsPerPage : 0;
  const indexOfLastItem =
    currentPage && itemsPerPage ? currentPage * itemsPerPage : 0;
  const showPagination =
    totalPages && totalPages > 1 && onPageChange !== undefined;

  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 shadow-lg p-6 transition-all duration-200 min-h-145 flex flex-col justify-between ${className}`}
    >
      {(title || subTitle || action) && (
        <div className="flex items-start justify-between gap-4">
          <div>
            {title && (
              <h3 className="text-xl font-semibold text-slate-900 leading-snug">
                {title}
              </h3>
            )}
            {subTitle && (
              <p className="text-sm text-slate-500 mt-0.5">{subTitle}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}

      <div className="mt-5 flex-1 flex flex-col justify-between">
        <div>{children}</div>

        {showPagination && (
          <div className="flex justify-between items-center pt-4 pr-5 pl-5 mt-auto">
            <span className="text-sm text-gray-500">
              Showing {indexOfFirstItem + 1} to{" "}
              {Math.min(indexOfLastItem, totalItems)} of {totalItems} entries
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
                disabled={currentPage === 1}
                className="btn-secondary py-1.5 px-3 text-sm"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() =>
                  onPageChange(Math.min(currentPage + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="btn-secondary py-1.5 px-3 text-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ListCard;
