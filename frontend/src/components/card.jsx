function Card({ title, subTitle, children, className = "", action }) {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 shadow-lg p-6 transition-all duration-200 ${className}`}
    >
      {(title || subTitle || action) && (
        <div className="flex items-start justify-between gap-4">
          <div>
            {title && (
              <h3 className="text-base font-semibold text-slate-900 leading-snug">
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
      {children}
    </div>
  );
}

export default Card;
