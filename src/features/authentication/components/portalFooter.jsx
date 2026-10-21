function PortalFooter({
  rightContent = null,
  text = "Exakt Med Multi-Facility Inventory Management System \u00a9 2026-2027",
}) {
  return (
    <footer className="max-w-6xl w-full mx-auto pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
      <p>{text}</p>
      {rightContent && (
        <div className="flex items-center gap-4">{rightContent}</div>
      )}
    </footer>
  );
}

export default PortalFooter;
