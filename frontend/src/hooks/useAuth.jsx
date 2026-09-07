import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getRedirectPathForRole } from "../utils/helpers";
import { ROLES } from "../config/roles";

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

  const [project, setProject] = useState(() => {
    try {
      const projString = localStorage.getItem("currentProject");
      return projString ? JSON.parse(projString) : null;
    } catch {
      return null;
    }
  });

  const isAuthenticated = Boolean(user);

  const login = (userData) => {
    localStorage.setItem("currentUser", JSON.stringify(userData));
    setUser(userData);
    // Admins and Super Admins redirect to project selection first, other roles to facility selection
    if (
      userData?.role === "Admin" ||
      userData?.role === "Super Admin" ||
      userData?.role === ROLES.SUPER_ADMIN ||
      userData?.role === ROLES.ADMIN
    ) {
      navigate("/select-project", { replace: true });
    } else {
      navigate("/select-facility", { replace: true });
    }
  };

  const selectProject = (projectData, navigateToFacility = true) => {
    localStorage.setItem("currentProject", JSON.stringify(projectData));
    setProject(projectData);
    if (navigateToFacility) {
      navigate("/select-facility", { replace: true });
    }
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
    localStorage.removeItem("currentProject");
    setUser(null);
    setFacility(null);
    setProject(null);
    navigate("/", { replace: true });
  };

  return {
    user,
    facility,
    project,
    isAuthenticated,
    login,
    selectProject,
    selectFacility,
    logout,
  };
}

export default useAuth;
