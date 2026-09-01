export const ROLES = {
  ADMIN: "Admin",
  PHARMACIST: "Pharmacist Manager",
  PROCUREMENT: "Procurement Officer",
};

export const ROLE_DETAILS = {
  [ROLES.ADMIN]: {
    label: "Administrator",
    description:
      "Full system access, user management, facility & supplier settings",
    badgeColor: "bg-purple-100 text-purple-700 border-purple-200",
    defaultRoute: "/admin/users",
  },
  [ROLES.PHARMACIST]: {
    label: "Pharmacist Manager",
    description: "Manages medicine inventory, stock levels, and dispensing",
    badgeColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
    defaultRoute: "/pharmacist/dashboard",
  },
  [ROLES.PROCUREMENT]: {
    label: "Procurement Officer",
    description: "Oversees purchase orders, supplier batches, and receiving",
    badgeColor: "bg-blue-100 text-blue-700 border-blue-200",
    defaultRoute: "/procurement/dashboard",
  },
};
