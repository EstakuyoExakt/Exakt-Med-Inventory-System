import { ROLE_DETAILS } from "../config/roles";

/**
 * Determines the default landing page route for a given user role.
 *
 * @param {string} role - The user's role identifier (e.g., 'SuperAdmin', 'Pharmacist')
 * @returns {string} The path to navigate to, or '/unauthorized' if unrecognized
 */
export const getRedirectPathForRole = (role) => {
  return ROLE_DETAILS[role]?.defaultRoute || "/unauthorized";
};

export default {
  getRedirectPathForRole,
};
