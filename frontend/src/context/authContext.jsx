import { createContext, useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getRedirectPathForRole } from "../utils/helpers";
import { ROLE_DETAILS } from "../config/roles";
import authService from "../services/auth";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();

  const [user, setUser] = useState(() => {
    try {
      const userString = localStorage.getItem("currentUser");
      return userString ? JSON.parse(userString) : null;
    } catch {
      return null;
    }
  });

  const [facility, setFacilityState] = useState(() => {
    try {
      const facString = localStorage.getItem("currentFacility");
      return facString ? JSON.parse(facString) : null;
    } catch {
      return null;
    }
  });

  const [project, setProjectState] = useState(() => {
    try {
      const projString = localStorage.getItem("currentProject");
      return projString ? JSON.parse(projString) : null;
    } catch {
      return null;
    }
  });

  const isAuthenticated = Boolean(user);

  // Synchronize state if another tab or event modifies localStorage
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "currentUser") {
        try {
          setUser(e.newValue ? JSON.parse(e.newValue) : null);
        } catch {
          setUser(null);
        }
      }
      if (e.key === "currentFacility") {
        try {
          setFacilityState(e.newValue ? JSON.parse(e.newValue) : null);
        } catch {
          setFacilityState(null);
        }
      }
      if (e.key === "currentProject") {
        try {
          setProjectState(e.newValue ? JSON.parse(e.newValue) : null);
        } catch {
          setProjectState(null);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const login = async (credentials) => {
    const response = await authService.login(credentials);

    if (response?.token) {
      localStorage.setItem("token", response.token);
    }

    const userData = {
      username: response.username,
      role: response.role,
      token: response.token,
    };

    localStorage.setItem("currentUser", JSON.stringify(userData));
    setUser(userData);

    const targetRoute = ROLE_DETAILS[userData?.role]?.initialRoute;
    navigate(targetRoute, { replace: true });

    return userData;
  };

  const selectProject = (projectData, navigateToFacility = true) => {
    localStorage.setItem("currentProject", JSON.stringify(projectData));
    setProjectState(projectData);
    if (navigateToFacility) {
      navigate("/select-facility", { replace: true });
    }
  };

  const setProject = (projectData) => {
    if (projectData) {
      localStorage.setItem("currentProject", JSON.stringify(projectData));
    } else {
      localStorage.removeItem("currentProject");
    }
    setProjectState(projectData);
  };

  const selectFacility = (facilityData) => {
    localStorage.setItem("currentFacility", JSON.stringify(facilityData));
    setFacilityState(facilityData);
    const redirectPath = getRedirectPathForRole(user?.role);
    navigate(redirectPath, { replace: true });
  };

  const setFacility = (facilityData) => {
    if (facilityData) {
      localStorage.setItem("currentFacility", JSON.stringify(facilityData));
    } else {
      localStorage.removeItem("currentFacility");
    }
    setFacilityState(facilityData);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("currentUser");
    localStorage.removeItem("currentFacility");
    localStorage.removeItem("currentProject");
    setUser(null);
    setFacilityState(null);
    setProjectState(null);
    navigate("/", { replace: true });
  };

  const contextValue = useMemo(
    () => ({
      user,
      facility,
      project,
      isAuthenticated,
      login,
      selectProject,
      setProject,
      selectFacility,
      setFacility,
      logout,
    }),
    [user, facility, project, isAuthenticated],
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

export default AuthContext;
