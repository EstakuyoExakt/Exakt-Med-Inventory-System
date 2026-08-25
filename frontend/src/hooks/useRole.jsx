import { useAuth } from "./useAuth";
import { ROLES, ROLE_DETAILS } from "../config/roles";

export function useRole() {
  const { user, isAuthenticated } = useAuth();
  const role = user?.role || null;

  // Role metadata from config
  const roleDetails = role ? ROLE_DETAILS[role] : null;

  // Boolean helper flags
  const isAdmin = role === ROLES.ADMIN;
  const isPharmacist = role === ROLES.PHARMACIST;
  const isProcurement = role === ROLES.PROCUREMENT;
  const isAccountant = role === ROLES.ACCOUNTANT;

  const hasRole = (allowedRoles) => {
    if (!role || !isAuthenticated) return false;

    // If no roles specified, deny by default
    if (!allowedRoles) return false;

    // Handle array of roles
    if (Array.isArray(allowedRoles)) {
      if (allowedRoles.length === 0) return true;
      return allowedRoles.includes(role);
    }

    // Handle single string role
    return role === allowedRoles;
  };

  return {
    role,
    roleDetails,
    isAuthenticated,
    isAdmin,
    isPharmacist,
    isProcurement,
    isAccountant,
    hasRole,
  };
}

export default useRole;
