import { Boxes, LogOut } from "lucide-react";

function PortalHeader({
  user,
  roleInfo,
  subtitle = "Inventory Management Portal",
  onLogout,
  badgeTheme = "purple", // "purple" | "blue"
}) {
  const avatarBg =
    badgeTheme === "purple"
      ? "bg-purple-100 text-purple-700"
      : "bg-blue-100 text-blue-700";

  return (
    <header className="max-w-6xl w-full mx-auto flex items-center justify-between pb-6 border-b border-gray-200">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
          <Boxes className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-base font-bold text-gray-900 leading-tight">
            Exakt Med Inventory
          </h1>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
      </div>

      {/* User Profile & Sign Out */}
      <div className="flex items-center gap-3">
        {user && (
          <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 bg-white rounded-xl border border-gray-200 shadow-xs">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${avatarBg}`}
            >
              {user.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-gray-900 leading-none">
                {user.name}
              </p>
              <span
                className={`inline-block mt-0.5 px-1.5 py-0.2 text-[10px] font-semibold rounded ${
                  roleInfo?.badgeColor ||
                  "bg-gray-100 text-gray-700 border border-gray-200"
                }`}
              >
                {roleInfo?.label || user.role}
              </span>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onLogout}
          className="btn-secondary text-xs px-3 py-2 text-gray-600 hover:text-red-600 hover:border-red-200 cursor-pointer"
          title="Sign out of account"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
}

export default PortalHeader;
