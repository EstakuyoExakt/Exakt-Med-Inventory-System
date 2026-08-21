function Table({
  headers = [],
  children,
  isEmpty = false,
  emptyMessage = "No records found.",
  className = "",
}) {
  const colCount = headers.length || 1;

  return (
    <div className={`${className}`}>
      <table className="w-full text-left border-collapse relative">
        <thead className="sticky top-0 z-10 bg-white">
          <tr className="border-b bg-gray-50 text-gray-600 text-sm">
            {headers.map((header, index) => {
              const isObj = typeof header === "object" && header !== null;
              const label = isObj ? header.label : header;
              const align =
                isObj && header.align
                  ? `text-${header.align}`
                  : label === "Actions"
                    ? "text-center"
                    : "";
              const thClass = isObj && header.className ? header.className : "";

              return (
                <th
                  key={index}
                  className={`p-3 font-medium ${align} ${thClass}`}
                >
                  {label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {children}
          {isEmpty && (
            <tr className="h-64">
              <td
                colSpan={colCount}
                className="p-8 text-center text-gray-500 align-middle"
              >
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
