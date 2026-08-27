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
