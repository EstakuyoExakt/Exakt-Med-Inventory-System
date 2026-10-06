import { ROLES } from "../config/roles";

/**
 * Checks whether the current user is permitted to edit the target user.
 * - SuperAdmin can edit all roles EXCEPT other SuperAdmins (can edit themselves).
 * - Admin cannot edit SuperAdmins or other Admins (can edit themselves).
 *
 * @param {Object} targetUser - The user being edited
 * @param {Object} currentUser - The currently authenticated user
 * @returns {boolean} True if allowed to edit
 */
export const canEditUser = (targetUser, currentUser) => {
  if (!targetUser || !currentUser) return false;

  const isCurrentSuperAdmin =
    currentUser.role === ROLES.SUPER_ADMIN || currentUser.role === "Super Admin";
  const isTargetSuperAdmin =
    targetUser.role === ROLES.SUPER_ADMIN || targetUser.role === "Super Admin";
  const isTargetAdmin =
    targetUser.role === ROLES.ADMIN || targetUser.role === "Admin";

  // Super Admin: can edit all roles except other Super Admins
  if (isCurrentSuperAdmin) {
    if (isTargetSuperAdmin && targetUser.id !== currentUser.id) {
      return false;
    }
    return true;
  }

  // Regular Admin: cannot edit Super Admins
  if (isTargetSuperAdmin) {
    return false;
  }

  // Regular Admin: cannot edit other Admins
  if (isTargetAdmin && targetUser.id !== currentUser.id) {
    return false;
  }

  return true;
};

/**
 * Checks whether the current user is permitted to delete the target user.
 * - SuperAdmin accounts can NEVER be deleted by anyone.
 * - SuperAdmin can delete all non-SuperAdmin users.
 * - Regular Admin cannot delete any Admin accounts.
 *
 * @param {Object} targetUser - The user to be deleted
 * @param {Object} currentUser - The currently authenticated user
 * @returns {boolean} True if allowed to delete
 */
export const canDeleteUser = (targetUser, currentUser) => {
  if (!targetUser) return false;

  const isCurrentSuperAdmin =
    currentUser?.role === ROLES.SUPER_ADMIN || currentUser?.role === "Super Admin";
  const isTargetSuperAdmin =
    targetUser.role === ROLES.SUPER_ADMIN || targetUser.role === "Super Admin";
  const isTargetAdmin =
    targetUser.role === ROLES.ADMIN || targetUser.role === "Admin";

  // Super Admin accounts can never be deleted
  if (isTargetSuperAdmin) {
    return false;
  }

  // Super Admin can delete all non-super-admin users
  if (isCurrentSuperAdmin) {
    return true;
  }

  // Regular Admin cannot delete any Admin account
  if (isTargetAdmin) {
    return false;
  }

  return true;
};

export default {
  canEditUser,
  canDeleteUser,
};
