import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Pill,
  Boxes,
  ClipboardList,
  LogOut,
  Cross,
  DollarSign,
  Users,
} from "lucide-react";

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
  const isAdmin = currentUser?.role === "admin";

  const adminNavItems = [
    { name: "User Management", path: "/user-management", icon: Users },
  ];

  const mainNavItems = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Medicine Master", path: "/medicine-master", icon: Pill },
    { name: "Inventory", path: "/inventory", icon: Boxes },
    { name: "Accounting", path: "/accounting", icon: DollarSign },
    { name: "Audit Logs", path: "/audit-logs", icon: ClipboardList },
  ];

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    navigate("/");
  };

  return (
    <div className="w-64 h-screen bg-white border-r border-gray-200 flex flex-col justify-between p-4 shadow-xl select-none absolute left-0">
      {/* Brand Header */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <Cross className="w-5 h-5 rotate-45" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">
              Exakt Med
            </h1>
            <p className="text-xs text-blue-600 font-medium">
              Inventory System
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-4">
          {isAdmin && (
            <div>
              <p className="px-2 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Admin
              </p>
              <ul className="space-y-1">
                {adminNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;

                  return (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        className={`sidebar-btn ${isActive ? "sidebar-btn-active" : ""}`}
                      >
                        <Icon
                          className={`w-4 h-4 ${isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"}`}
                        />
                        <span>{item.name}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div>
            <p className="px-2 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Menu
            </p>
            <ul className="space-y-1">
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`sidebar-btn ${isActive ? "sidebar-btn-active" : ""}`}
                    >
                      <Icon
                        className={`w-4 h-4 ${isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"}`}
                      />
                      <span>{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
      </div>

      {/* Logout Action */}
      <div className="pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={handleLogout}
          className="sidebar-btn sidebar-btn-danger"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
