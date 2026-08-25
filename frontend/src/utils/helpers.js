import { ROLE_DETAILS, ROLES } from "../config/roles";

// Helper to determine redirect path based on user role
export const getRedirectPathForRole = (role) => {
  return ROLE_DETAILS[role]?.defaultRoute || "/unauthorized";
};
