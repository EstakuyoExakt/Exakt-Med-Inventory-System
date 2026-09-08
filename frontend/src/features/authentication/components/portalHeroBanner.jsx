import { Sparkles } from "lucide-react";

function PortalHeroBanner({
  badgeText,
  badgeIcon: BadgeIcon = Sparkles,
  badgeTheme = "purple", // "purple" | "blue"
  title,
  description,
  children,
  className = "",
}) {
  const themeClasses =
    badgeTheme === "purple"
      ? "bg-purple-50 border-purple-200 text-purple-700"
      : "bg-blue-50 border-blue-200 text-blue-700";

  return (
    <div
      className={`text-center max-w-2xl mx-auto space-y-2 animate-slide-up ${className}`}
    >
      {badgeText && (
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${themeClasses}`}
        >
          <BadgeIcon className="w-3.5 h-3.5" />
          <span>{badgeText}</span>
        </div>
      )}

      {title && (
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          {title}
        </h2>
      )}

      {description && (
        <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
      )}

      {children}
    </div>
  );
}

export default PortalHeroBanner;
