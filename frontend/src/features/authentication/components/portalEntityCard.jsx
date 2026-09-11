import {
  CheckCircle2,
  Pencil,
  Trash2,
  UserPlus,
  Loader2,
  ChevronRight,
  ArrowRight,
  User,
  Shield,
} from "lucide-react";
import RoleGuard from "../../../components/guard/roleGuard";
import { ROLES } from "../../../config/roles";

const THEME_STYLES = {
  purple: {
    hoverBorder: "hover:border-purple-500",
    selectedRing: "ring-2 ring-purple-600 border-purple-600 bg-purple-50/20",
    iconBox:
      "bg-purple-50 border-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white",
    codeBadge: "text-purple-700 bg-purple-50 border-purple-100",
    titleHover: "group-hover:text-purple-700",
    sessionBadge: "text-purple-700 bg-purple-50 border-purple-200",
    assignedTag: "bg-purple-50 text-purple-700 border-purple-100",
    assignedIcon: "text-purple-500",
    assignBtn: "text-purple-600 hover:text-purple-800",
    footerTextHover: "group-hover:text-purple-600",
    footerBtnText: "text-purple-600",
  },
  blue: {
    hoverBorder: "hover:border-blue-500",
    selectedRing: "ring-2 ring-blue-600 border-blue-600 bg-blue-50/20",
    iconBox:
      "bg-gray-50 border-gray-100 group-hover:bg-blue-50 group-hover:border-blue-100",
    codeBadge: "text-gray-500 bg-gray-100 border-transparent",
    titleHover: "group-hover:text-blue-600",
    sessionBadge: "text-blue-700 bg-blue-50 border-blue-200",
    assignedTag: "bg-blue-50 text-blue-700 border-blue-100",
    assignedIcon: "text-blue-500",
    assignBtn: "text-blue-600 hover:text-blue-800",
    footerTextHover: "group-hover:text-blue-600",
    footerBtnText: "text-blue-600",
  },
};

function PortalEntityCard({
  icon,
  code,
  badgeText,
  title,
  themeColor = "blue",
  status = "Active",
  showStatusBadge = false,
  isActiveSession = false,
  sessionBadgeLabel = "Current Active",
  isSelected = false,
  isSubmitting = false,
  onSelect,
  // Header action controls
  onEdit,
  onDelete,
  editRoles = [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  editTitle = "Edit",
  deleteTitle = "Delete",
  showAssigned = true,
  assignedLabel = "Assigned Members",
  assignedItems = [],
  assignedIconType = "user", // "user" | "shield"
  assignRoles = [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  onAssign,
  emptyAssignedText = "No members assigned yet",
  maxPreviewMembers = 3,
  // Footer style & CTA
  footerVariant = "full", // "full" (facility style) | "compact" (project style)
  footerLabel = null, // e.g. "Select project & choose facility"
  selectButtonText = "Select",
  enteringText = "Entering Facility...",
  children,
}) {
  const theme = THEME_STYLES[themeColor] || THEME_STYLES.blue;
  const isInactive = status === "Inactive";
  const AssignedIcon = assignedIconType === "shield" ? Shield : User;

  return (
    <div
      onClick={() => !isInactive && !isSubmitting && onSelect && onSelect()}
      className={`group relative bg-white rounded-2xl border p-5 transition-all duration-200 flex flex-col justify-between ${
        isInactive
          ? "opacity-60 bg-gray-50/80 border-gray-200 cursor-not-allowed"
          : `hover:shadow-lg hover:-translate-y-0.5 cursor-pointer border-gray-200 ${theme.hoverBorder}`
      } ${isSelected ? theme.selectedRing : ""}`}
    >
      <div>
        {/* Top Header Row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-10 sm:h-11 w-10 sm:w-11 items-center justify-center rounded-xl border transition-colors shrink-0 ${theme.iconBox}`}
            >
              {icon}
            </div>
            <div>
              <span
                className={`font-mono text-[11px] font-bold uppercase px-2 py-0.5 rounded border ${theme.codeBadge}`}
              >
                {code}
              </span>
              <p
                className={`text-[11px] mt-0.5 font-medium ${
                  themeColor === "blue"
                    ? "font-semibold text-blue-600"
                    : "text-gray-500"
                }`}
              >
                {badgeText}
              </p>
            </div>
          </div>

          {/* Status Badges, Session Indicator, & Admin Action Buttons */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <div className="flex items-center gap-1.5">
              {/* Optional Operational Status Badge */}
              {showStatusBadge && (
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    status === "Active"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-red-50 text-red-600 border border-red-200"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      status === "Active" ? "bg-emerald-500" : "bg-red-400"
                    }`}
                  />
                  {status}
                </span>
              )}

              {/* Edit & Delete Action Menu */}
              {(onEdit || onDelete) && (
                <RoleGuard allowedRoles={editRoles}>
                  <div className="flex items-center gap-0.5 bg-gray-50/90 p-0.5 rounded-lg border border-gray-100">
                    {onEdit && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit();
                        }}
                        className="p-1 text-gray-400 hover:text-amber-600 hover:bg-white rounded transition-all cursor-pointer hover:shadow-2xs"
                        title={editTitle}
                        aria-label={editTitle}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete();
                        }}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-white rounded transition-all cursor-pointer hover:shadow-2xs"
                        title={deleteTitle}
                        aria-label={deleteTitle}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </RoleGuard>
              )}
            </div>

            {/* Session Indicator Badge */}
            {isActiveSession && (
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${theme.sessionBadge}`}
              >
                <CheckCircle2 className="w-3 h-3" />
                {sessionBadgeLabel}
              </span>
            )}
          </div>
        </div>

        {/* Card Title */}
        <h3
          className={`text-base font-bold text-gray-900 transition-colors line-clamp-2 ${theme.titleHover}`}
        >
          {title}
        </h3>

        {/* Custom Middle Content Slot */}
        {children}

        {/* Assigned Members Section */}
        {showAssigned && (
          <div className="mt-3.5 pt-3 border-t border-gray-100 space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                {assignedLabel} ({assignedItems.length})
              </p>
              {onAssign && (
                <RoleGuard allowedRoles={assignRoles}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAssign();
                    }}
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold hover:underline cursor-pointer ${theme.assignBtn}`}
                    title={`Assign or manage members for this ${badgeText?.toLowerCase() || "item"}`}
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>Assign</span>
                  </button>
                </RoleGuard>
              )}
            </div>

            {assignedItems.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {assignedItems.slice(0, maxPreviewMembers).map((item) => (
                  <span
                    key={item.id}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md border ${theme.assignedTag}`}
                  >
                    <AssignedIcon
                      className={`w-3 h-3 shrink-0 ${theme.assignedIcon}`}
                    />
                    <span className="truncate max-w-28">{item.name}</span>
                  </span>
                ))}
                {assignedItems.length > maxPreviewMembers && (
                  <span className="text-[10px] text-gray-400 font-medium self-center pl-0.5">
                    +{assignedItems.length - maxPreviewMembers} more
                  </span>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">{emptyAssignedText}</p>
            )}
          </div>
        )}
      </div>

      {/* Card Action Footer */}
      {footerVariant === "compact" ? (
        /* Project-Style Compact Footer with Text & Right Arrow */
        <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between">
          <span
            className={`text-xs font-medium text-gray-400 transition-colors ${theme.footerTextHover}`}
          >
            {footerLabel || "Select & enter workspace"}
          </span>
          <button
            type="button"
            disabled={isSubmitting}
            className={`flex items-center gap-1 text-xs font-bold group-hover:translate-x-1 transition-transform ${theme.footerBtnText}`}
          >
            {isSelected && isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{selectButtonText}</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      ) : (
        /* Facility-Style Full Width Button Footer */
        <div className="mt-4 pt-3 border-t border-gray-100">
          <button
            type="button"
            disabled={isInactive || isSubmitting}
            className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              !isInactive
                ? "bg-gray-100 text-gray-800 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-md group-hover:shadow-blue-500/20 cursor-pointer"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            {isSelected && isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{enteringText}</span>
              </>
            ) : (
              <>
                <span>{isInactive ? "Facility Inactive" : selectButtonText}</span>
                {!isInactive && (
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                )}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default PortalEntityCard;
