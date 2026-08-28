import { useState, useMemo } from "react";
import { Eye, EyeOff, Loader2, Boxes, ShieldCheck } from "lucide-react";
import { users } from "../../data/user";
import useAuth from "../../hooks/useAuth";

function Login() {
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 1 User per role for quick demo testing
  const uniqueRoleUsers = useMemo(() => {
    const seenRoles = new Set();
    return users.filter((user) => {
      if (seenRoles.has(user.role)) {
        return false;
      }
      seenRoles.add(user.role);
      return true;
    });
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    setTimeout(() => {
      const matchedUser = users.find(
        (user) =>
          user.username.toLowerCase() === username.trim().toLowerCase() &&
          user.password === password,
      );

      if (!matchedUser) {
        setErrorMessage("Invalid username or password. Please try again.");
        setIsLoading(false);
        return;
      }

      // Check account status
      if (matchedUser.status !== "Active") {
        setErrorMessage(
          "Your account is inactive. Please contact an administrator.",
        );
        setIsLoading(false);
        return;
      }

      // Use the auth hook to store user and handle role-based navigation
      login(matchedUser);
    }, 500);
  };

  // Quick fill helper for testing different roles
  const handleQuickFill = (user) => {
    setUsername(user.username);
    setPassword(user.password);
    setErrorMessage("");
  };

  return (
    <div className="w-full max-w-md mx-4 p-8 bg-white rounded-2xl shadow-xl border border-gray-200">
      {/* Brand Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 text-blue-600 mb-3 shadow-inner">
          <Boxes className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Exakt Med Inventory
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Role-Based Hospital & Pharmacy Management
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="text-center mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
          {errorMessage}
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Username Field */}
        <div>
          <label
            htmlFor="username"
            className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5"
          >
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            required
            autoComplete="username"
            placeholder="e.g. ExaktAdmin, msantos"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="input"
          />
        </div>

        {/* Password Field */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-wider text-gray-600"
            >
              Password
            </label>
            <a
              href="#forgot-password"
              className="text-xs font-medium text-blue-600 hover:text-blue-700 transition duration-150"
            >
              Forgot password?
            </a>
          </div>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full py-2.5 mt-2 font-medium shadow-md shadow-blue-500/20 active:scale-[0.99] transition-transform"
        >
          {isLoading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Authenticating role...
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Sign In
            </span>
          )}
        </button>
      </form>

      {/* Demo Role Fast-Switcher for Easy Testing */}
      <div className="mt-6 pt-5 border-t border-gray-100">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 text-center mb-2.5">
          Quick Demo Accounts
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {uniqueRoleUsers.map((demoUser) => (
            <button
              key={demoUser.id}
              type="button"
              onClick={() => handleQuickFill(demoUser)}
              className="text-left px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors text-xs text-gray-700 cursor-pointer"
            >
              <span className="font-semibold block truncate">
                {demoUser.role}
              </span>
              <span className="text-[11px] text-gray-400 block truncate">
                {demoUser.username}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 mt-5">
        <span>Exakt Med &copy; 2026-2027</span>
      </div>
    </div>
  );
}

export default Login;
