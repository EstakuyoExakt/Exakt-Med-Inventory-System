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

  const [facility, setFacility] = useState(() => {
    try {
      const facString = localStorage.getItem("currentFacility");
      return facString ? JSON.parse(facString) : null;
    } catch {
      return null;
    }
  });

  const isAuthenticated = Boolean(user);

  const login = (userData) => {
    localStorage.setItem("currentUser", JSON.stringify(userData));
    setUser(userData);
    // Redirect to facility selection after login
    navigate("/select-facility", { replace: true });
  };

  const selectFacility = (facilityData) => {
    localStorage.setItem("currentFacility", JSON.stringify(facilityData));
    setFacility(facilityData);
    const redirectPath = getRedirectPathForRole(user?.role);
    navigate(redirectPath, { replace: true });
  };

  const logout = () => {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("currentFacility");
    setUser(null);
    setFacility(null);
    navigate("/", { replace: true });
  };

  return {
    user,
    facility,
    isAuthenticated,
    login,
    selectFacility,
    logout,
  };
}

export default useAuth;
