import { NavLink, useNavigate } from "react-router-dom";
import { Boxes, LogOut, Building2, ArrowLeftRight } from "lucide-react";
import { NAVIGATION_ITEMS } from "../../config/navigation";
import { ROLE_DETAILS } from "../../config/roles";
import useAuth from "../../hooks/useAuth";

function Sidebar() {
  const navigate = useNavigate();
  const { user, facility, logout } = useAuth();

  // Filter navigation items based on user role
  const userRole = user?.role;
  const filteredNavItems = NAVIGATION_ITEMS.filter((item) =>
    item.roles.includes(userRole),
  );

  // Get role metadata (badge colors, display labels)
  const roleInfo = userRole ? ROLE_DETAILS[userRole] : null;

  const handleLogout = () => {
    logout();
  };

  const handleSwitchFacility = () => {
    navigate("/select-facility");
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 border-r border-gray-200 bg-white flex flex-col justify-between p-4 z-50 overflow-y-auto">
      <div className="flex flex-col gap-5">
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
            Menu
          </p>
          <ul className="flex flex-col gap-1">
            {filteredNavItems.map(({ title, path, icon: Icon }) => (
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
