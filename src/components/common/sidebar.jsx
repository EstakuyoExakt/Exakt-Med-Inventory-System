import { useState, useMemo } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  Boxes,
  LogOut,
  Building2,
  ArrowLeftRight,
  SlidersHorizontal,
  ShieldCheck,
  Pill,
  ShoppingCart,
} from "lucide-react";
import { NAVIGATION_ITEMS } from "../../config/navigation";
import { ROLES } from "../../config/roles";
import useAuth from "../../hooks/useAuth";
import useRole from "../../hooks/useRole";

const VIEW_MODES = [
  {
    id: "admin",
    label: "Admin",
    title: "Super Admin & Admin",
    icon: ShieldCheck,
    filter: (item) =>
      item.roles.includes(ROLES.SUPER_ADMIN) ||
      item.roles.includes(ROLES.ADMIN),
  },
  {
    id: "pharmacist",
    label: "Pharmacist",
    title: "Pharmacist Manager",
    icon: Pill,
    filter: (item) => item.roles.includes(ROLES.PHARMACIST),
  },
  {
    id: "procurement",
    label: "Procurement",
    title: "Procurement Officer",
    icon: ShoppingCart,
    filter: (item) => item.roles.includes(ROLES.PROCUREMENT),
  },
];

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, facility, logout } = useAuth();
  const { role: userRole, roleDetails: roleInfo, isSuperAdmin } = useRole();

  // Super Admin view switcher state (persisted in localStorage)
  const [activeRoleView, setActiveRoleView] = useState(() => {
    const saved = localStorage.getItem("exakt_superadmin_sidebar_view");
    if (saved && ["admin", "pharmacist", "procurement"].includes(saved)) {
      return saved;
    }
    if (window.location.pathname.startsWith("/pharmacist")) return "pharmacist";
    if (window.location.pathname.startsWith("/procurement"))
      return "procurement";
    return "admin";
  });

  const handleSelectView = (viewId) => {
    setActiveRoleView(viewId);
    localStorage.setItem("exakt_superadmin_sidebar_view", viewId);
  };

  const handleLogout = () => {
    logout();
  };

  const handleSwitchFacility = () => {
    navigate("/select-facility");
  };

  // Compute displayed navigation items
  const currentViewMode =
    VIEW_MODES.find((m) => m.id === activeRoleView) || VIEW_MODES[0];

  const displayedNavItems = useMemo(() => {
    if (!isSuperAdmin) {
      return NAVIGATION_ITEMS.filter((item) => item.roles.includes(userRole));
    }
    return NAVIGATION_ITEMS.filter(currentViewMode.filter);
  }, [isSuperAdmin, userRole, currentViewMode]);

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 border-r border-gray-200 bg-white flex flex-col justify-between p-4 z-50 overflow-y-auto">
      <div className="flex flex-col gap-4">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 pt-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shadow-inner">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-tight">
              Exakt Med
            </h1>
            <p className="text-xs text-gray-400">Inventory System</p>
          </div>
        </div>

        {/* User Profile Card */}
        {user && (
          <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/80 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-sm font-semibold text-white">
              {user.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-xs font-semibold text-gray-900">
                {user.name || user.username}
              </p>
              <span
                className={`inline-block mt-0.5 px-2 py-0.5 text-[10px] font-medium rounded-md border ${
                  roleInfo?.badgeColor ||
                  "bg-gray-100 text-gray-600 border-gray-200"
                }`}
              >
                {roleInfo?.label || userRole || "Staff"}
              </span>
            </div>
          </div>
        )}

        {/* Super Admin: Sidebar View Switcher Controls */}
        {isSuperAdmin && (
          <div className="rounded-xl border border-indigo-100 bg-linear-to-br from-indigo-50/70 via-slate-50 to-blue-50/40 p-2.5 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-950">
                  Sidebar View
                </span>
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 border border-indigo-200/60 uppercase tracking-wider">
                Super Admin
              </span>
            </div>

            {/* Quick Switch Buttons */}
            <div className="grid grid-cols-3 gap-1">
              {VIEW_MODES.map((mode) => {
                const isActive = activeRoleView === mode.id;
                const Icon = mode.icon;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => handleSelectView(mode.id)}
                    className={`flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-xs font-semibold ring-2 ring-indigo-600/20"
                        : "bg-white hover:bg-indigo-50/50 text-gray-700 border border-gray-200/70 hover:border-indigo-200"
                    }`}
                    title={`Switch sidebar to ${mode.title} content`}
                  >
                    <Icon
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isActive ? "text-white" : "text-gray-500"
                      }`}
                    />
                    <span className="truncate">{mode.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Active Facility Widget */}
        {facility && (
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-blue-50/60 border border-blue-100/80 text-xs">
            <div className="min-w-0 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700 shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                  Active Facility
                </p>
                <p className="font-semibold text-gray-900 truncate text-xs">
                  {facility.name}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSwitchFacility}
              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-100/80 transition-colors shrink-0 cursor-pointer"
              title="Switch Facility"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Role-based Navigation Links */}
        <nav>
          <p className="px-2 mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            {isSuperAdmin ? `${currentViewMode.label} Menu` : "Menu"}
          </p>
          <ul className="flex flex-col gap-1">
            {displayedNavItems.map(({ title, path, icon: Icon }) => (
              <li key={path}>
                <NavLink
                  to={path}
                  className={({ isActive }) =>
                    `sidebar-btn ${isActive ? "sidebar-btn-active" : ""}`
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{title}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Logout Footer Button */}
      <div className="border-t border-gray-100 pt-3">
        <button
          type="button"
          onClick={handleLogout}
          className="sidebar-btn sidebar-btn-danger"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
