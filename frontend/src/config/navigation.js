import {
  LayoutDashboard,
  Users,
  Building2,
  Truck,
  Pill,
  Package,
  Receipt,
} from "lucide-react";
import { ROLES } from "./roles";

export const NAVIGATION_ITEMS = [
  // --- Admin Feature Routes ---
  {
    title: "User Management",
    path: "/admin/users",
    icon: Users,
    roles: [ROLES.ADMIN],
  },
  {
    title: "Supplier Management",
    path: "/admin/suppliers",
    icon: Truck,
    roles: [ROLES.ADMIN],
  },
  {
    title: "Facility Management",
    path: "/admin/facilities",
    icon: Building2,
    roles: [ROLES.ADMIN],
  },
  {
    title: "Billing Confirmation",
    path: "admin/billing",
    icon: Receipt,
    roles: [ROLES.ADMIN],
  },

  // --- Pharmacist Routes ---
  {
    title: "Pharmacy Dashboard",
    path: "/pharmacist/dashboard",
    icon: LayoutDashboard,
    roles: [ROLES.PHARMACIST],
  },
  {
    title: "SKU Management",
    path: "/pharmacist/sku-management",
    icon: Pill,
    roles: [ROLES.PHARMACIST],
  },
  {
    title: "Batch Management",
    path: "/pharmacist/batch-management",
    icon: Package,
    roles: [ROLES.PHARMACIST],
  },

  // --- Procurement Officer Routes ---
  {
    title: "Procurement Dashboard",
    path: "/procurement/dashboard",
    icon: LayoutDashboard,
    roles: [ROLES.PROCUREMENT],
  },
  {
    title: "Batch Management",
    path: "/procurement/batches",
    icon: Package,
    roles: [ROLES.PROCUREMENT],
  },

  // --- Accountant Routes ---
  {
    title: "Financial Dashboard",
    path: "/accountant/dashboard",
    icon: LayoutDashboard,
    roles: [ROLES.ACCOUNTANT],
  },
  {
    title: "Invoices & Billing",
    path: "/accountant/invoices",
    icon: Receipt,
    roles: [ROLES.ACCOUNTANT],
  },
];
