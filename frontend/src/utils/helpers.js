import { ROLE_DETAILS, ROLES } from "../config/roles";

// Helper to determine redirect path based on user role
export const getRedirectPathForRole = (role) => {
  return ROLE_DETAILS[role]?.defaultRoute || "/unauthorized";
};

// Helper to determine expiry status and badge formatting
export const getExpiryStatus = (expiryDateStr) => {
  if (!expiryDateStr) {
    return {
      status: "VALID",
      label: "Valid",
      color: "text-emerald-700 bg-emerald-50 border-emerald-200",
      dot: "bg-emerald-500",
      daysRemaining: 999,
    };
  }

  const today = new Date();
  const expDate = new Date(expiryDateStr);
  const diffTime = expDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      status: "EXPIRED",
      label: `Expired (${Math.abs(diffDays)}d ago)`,
      color: "text-red-700 bg-red-50 border-red-200",
      dot: "bg-red-500",
      daysRemaining: diffDays,
    };
  } else if (diffDays <= 90) {
    return {
      status: "NEAR_EXPIRY",
      label: `Near Expiry (${diffDays}d left)`,
      color: "text-amber-700 bg-amber-50 border-amber-200",
      dot: "bg-amber-500",
      daysRemaining: diffDays,
    };
  } else {
    return {
      status: "HEALTHY",
      label: `${diffDays}d remaining`,
      color: "text-emerald-700 bg-emerald-50 border-emerald-200",
      dot: "bg-emerald-500",
      daysRemaining: diffDays,
    };
  }
};

// Helper to determine stock status badge and coloring for SKUs
export const getStockStatus = (sku) => {
  if (!sku) {
    return {
      label: "Unknown",
      color: "bg-gray-50 text-gray-700 border-gray-200",
      dotColor: "bg-gray-500",
    };
  }

  if (sku.currentStock === 0) {
    return {
      label: "Out of Stock",
      color: "bg-red-50 text-red-700 border-red-200",
      dotColor: "bg-red-500",
    };
  }
  if (sku.currentStock <= sku.minimumLevel) {
    return {
      label: "Critical (Below Min)",
      color: "bg-red-50 text-red-700 border-red-200",
      dotColor: "bg-red-500",
    };
  }
  if (sku.currentStock <= sku.reorderLevel) {
    return {
      label: "Reorder Triggered",
      color: "bg-amber-50 text-amber-700 border-amber-200",
      dotColor: "bg-amber-500",
    };
  }
  return {
    label: "Optimal Stock",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotColor: "bg-emerald-500",
  };
};

import { projects } from "../data/projects";

// Helper to get a project by ID
export const getProjectById = (projectId, projectList = projects) => {
  return projectList.find((p) => p.id === Number(projectId)) || null;
};

// Helper to get all facilities belonging to a project
export const getFacilitiesByProjectId = (
  projectId,
  facilityList = [],
  projectList = projects,
) => {
  const project = getProjectById(projectId, projectList);
  if (!project) return [];
  return facilityList.filter(
    (f) =>
      project.facilityIds?.includes(f.id) ||
      f.projectId === Number(projectId),
  );
};

// Helper to get the parent project for a specific facility
export const getProjectForFacility = (facility, projectList = projects) => {
  if (!facility) return null;
  return (
    projectList.find(
      (p) =>
        p.id === facility.projectId ||
        (Array.isArray(p.facilityIds) && p.facilityIds.includes(facility.id)),
    ) || null
  );
};

// Helper to prevent unauthorized user editing:
// - Super Admin can edit all roles EXCEPT other super admins (can edit themselves)
// - Admin cannot edit Super Admins, and cannot edit other Admins (can edit themselves)
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

// Helper to prevent unauthorized user deletion:
// - Super Admins can NEVER be deleted by anyone (including themselves or other super admins)
// - Super Admin can delete all other accounts (Admins, Pharmacists, Procurements)
// - Regular Admin cannot delete any Admin accounts
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

