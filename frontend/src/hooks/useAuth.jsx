import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getRedirectPathForRole } from "../utils/helpers";

export function useAuth() {
  const navigate = useNavigate();

  const [user, setUser] = useState(() => {
    try {
      const userString = localStorage.getItem("currentUser");
      return userString ? JSON.parse(userString) : null;
    } catch {
      return null;
    }
  });

  const isAuthenticated = Boolean(user);

  const login = (userData) => {
    localStorage.setItem("currentUser", JSON.stringify(userData));
    setUser(userData);
    const redirectPath = getRedirectPathForRole(userData.role);
    navigate(redirectPath, { replace: true });
  };

  const logout = () => {
    localStorage.removeItem("currentUser");
    setUser(null);
    navigate("/", { replace: true });
  };

  return {
    user,
    isAuthenticated,
    login,
    logout,
  };
}

export default useAuth;
