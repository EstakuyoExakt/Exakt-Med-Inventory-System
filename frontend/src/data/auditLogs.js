import { ROLES } from "../config/roles";

export const AUDIT_MODULES = [
  "All Modules",
  "Inventory",
  "Purchasing",
  "SKU Catalog",
  "Supplier Management",
  "Facility Management",
  "Security & Access",
];

export const AUDIT_SEVERITIES = [
  "All Severities",
  "info",
  "success",
  "warning",
  "critical",
];

export const auditLogs = [
  // --- Admin & Purchasing / Procurement ---
  {
    id: "LOG-2026-0142",
    timestamp: "2026-08-28 15:42:18",
    userId: 1,
    userName: "Sarah Jenkins",
    userRole: ROLES.ADMIN,
    visibleRoles: [ROLES.ADMIN, ROLES.PROCUREMENT],
    action: "PURCHASE_ORDER_APPROVED",
    actionLabel: "Purchase Order Approved",
    module: "Purchasing",
    severity: "success",
    target: "PO-2026-0104",
    facility: "Exakt Eastside Specialty Center",
    description:
      "Approved purchase order requisition for 1,000 units of Glucophage (Metformin 850mg) from Sanofi-Aventis Philippines.",
    ipAddress: "192.168.1.102",
  },
  {
    id: "LOG-2026-0141",
    timestamp: "2026-08-28 14:15:05",
    userId: 6,
    userName: "Carlos Reyes",
    userRole: ROLES.PROCUREMENT,
    visibleRoles: [ROLES.ADMIN, ROLES.PROCUREMENT],
    action: "PURCHASE_ORDER_CREATED",
    actionLabel: "Purchase Order Requisition Created",
    module: "Purchasing",
    severity: "info",
    target: "PO-2026-0109",
    facility: "Exakt Eastside Specialty Center",
    description:
      "Submitted purchase order request for 300 units of Alnix (Cetirizine 10mg) to Unilab Pharmaceuticals Inc.",
    ipAddress: "192.168.1.115",
  },

  // --- Pharmacist Inventory & Batches ---
  {
    id: "LOG-2026-0140",
    timestamp: "2026-08-28 11:30:44",
    userId: 3,
    userName: "Maria Santos",
    userRole: ROLES.PHARMACIST,
    visibleRoles: [ROLES.ADMIN, ROLES.PHARMACIST],
    action: "STOCK_ADJUSTMENT",
    actionLabel: "Stock Adjustment (Cycle Count)",
    module: "Inventory",
    severity: "warning",
    target: "BAT-2026-0421",
    facility: "Exakt Central General Hospital",
    description:
      "Adjusted batch quantity for Ponstan (Mefenamic Acid 500mg) from 120 to 105 units (-15 units). Reason: Physical Cycle Count Discrepancy.",
    ipAddress: "192.168.1.108",
  },
  {
    id: "LOG-2026-0139",
    timestamp: "2026-08-28 09:48:22",
    userId: 3,
    userName: "Maria Santos",
    userRole: ROLES.PHARMACIST,
    visibleRoles: [ROLES.ADMIN, ROLES.PHARMACIST],
    action: "BATCH_QUARANTINED",
    actionLabel: "Batch Placed in Quarantine",
    module: "Inventory",
    severity: "critical",
    target: "BAT-2026-0912",
    facility: "Exakt Central General Hospital",
    description:
      "Quarantined 200 units of Humulin R (Insulin 100IU). Reason: Temperature Excursion during Cold Chain Transit.",
    ipAddress: "192.168.1.108",
  },

  // --- Procurement Supplier Order ---
  {
    id: "LOG-2026-0138",
    timestamp: "2026-08-27 16:20:10",
    userId: 6,
    userName: "Carlos Reyes",
    userRole: ROLES.PROCUREMENT,
    visibleRoles: [ROLES.ADMIN, ROLES.PROCUREMENT],
    action: "ORDER_TRANSMITTED",
    actionLabel: "PO Transmitted to Vendor",
    module: "Purchasing",
    severity: "success",
    target: "PO-2026-0106",
    facility: "Exakt Central General Hospital",
    description:
      "Formally dispatched approved purchase order to Zuellig Pharma Corporation for 150 vials of Humulin R.",
    ipAddress: "192.168.1.115",
  },

  // --- Pharmacist Inventory Transfer ---
  {
    id: "LOG-2026-0137",
    timestamp: "2026-08-27 14:05:33",
    userId: 3,
    userName: "Maria Santos",
    userRole: ROLES.PHARMACIST,
    visibleRoles: [ROLES.ADMIN, ROLES.PHARMACIST],
    action: "STOCK_TRANSFERRED",
    actionLabel: "Inter-Facility Stock Transfer",
    module: "Inventory",
    severity: "info",
    target: "BAT-2026-0734",
    facility: "Exakt Northside Medical Wing",
    description:
      "Transferred 150 units of Amoxil (Amoxicillin 500mg) from Exakt Central General Hospital to Exakt Northside Medical Wing.",
    ipAddress: "192.168.1.108",
  },

  // --- Admin Purchasing Denial ---
  {
    id: "LOG-2026-0136",
    timestamp: "2026-08-27 10:12:50",
    userId: 1,
    userName: "Sarah Jenkins",
    userRole: ROLES.ADMIN,
    visibleRoles: [ROLES.ADMIN, ROLES.PROCUREMENT],
    action: "PURCHASE_ORDER_DENIED",
    actionLabel: "Purchase Order Rejected",
    module: "Purchasing",
    severity: "critical",
    target: "PO-2026-0098",
    facility: "Exakt Southpoint Wellness Clinic",
    description:
      "Denied purchase requisition for 800 units of Paracetamol Syrup. Reason: Existing stock buffer sufficient; pending Q4 budget review.",
    ipAddress: "192.168.1.102",
  },

  // --- Pharmacist SKU Calibration ---
  {
    id: "LOG-2026-0135",
    timestamp: "2026-08-26 15:30:19",
    userId: 4,
    userName: "Gabriel Cruz",
    userRole: ROLES.PHARMACIST,
    visibleRoles: [ROLES.ADMIN, ROLES.PHARMACIST],
    action: "SKU_CALIBRATED",
    actionLabel: "SKU Threshold Levels Calibrated",
    module: "SKU Catalog",
    severity: "info",
    target: "AMLO005-TAB-100",
    facility: "Exakt Central General Hospital",
    description:
      "Recalibrated inventory thresholds for Norvasc (Amlodipine 5mg). Minimum level updated to 40, Reorder level to 100, Maximum to 600.",
    ipAddress: "192.168.1.108",
  },

  // --- Procurement Batch Receiving ---
  {
    id: "LOG-2026-0134",
    timestamp: "2026-08-26 11:22:04",
    userId: 7,
    userName: "Beatriz Mendoza",
    userRole: ROLES.PROCUREMENT,
    visibleRoles: [ROLES.ADMIN, ROLES.PROCUREMENT, ROLES.PHARMACIST],
    action: "BATCH_REGISTERED",
    actionLabel: "New Stock Batch Received",
    module: "Inventory",
    severity: "success",
    target: "BAT-2026-1045",
    facility: "Exakt Central General Hospital",
    description:
      "Registered new shipment batch for 1,200 units of Biogesic (Paracetamol 500mg), Lot # UNL-2026-892, Expiry: 2028-06-30.",
    ipAddress: "192.168.1.115",
  },

  // --- Admin Supplier Management (Admin & Procurement) ---
  {
    id: "LOG-2026-0133",
    timestamp: "2026-08-25 16:40:12",
    userId: 1,
    userName: "Sarah Jenkins",
    userRole: ROLES.ADMIN,
    visibleRoles: [ROLES.ADMIN, ROLES.PROCUREMENT],
    action: "SUPPLIER_CREATED",
    actionLabel: "New Supplier Onboarded",
    module: "Supplier Management",
    severity: "success",
    target: "SUP-012",
    facility: "Exakt Central General Hospital",
    description:
      "Added new pharmaceutical supplier 'B. Braun Medical Supplies Inc.' (Contact: Maria Santos, Phone: +63 2 8588 8888).",
    ipAddress: "192.168.1.102",
  },

  // --- Pharmacist Quarantine Release ---
  {
    id: "LOG-2026-0132",
    timestamp: "2026-08-25 13:15:45",
    userId: 3,
    userName: "Maria Santos",
    userRole: ROLES.PHARMACIST,
    visibleRoles: [ROLES.ADMIN, ROLES.PHARMACIST],
    action: "BATCH_RELEASED",
    actionLabel: "Batch Released from Quarantine",
    module: "Inventory",
    severity: "success",
    target: "BAT-2026-0518",
    facility: "Exakt Central General Hospital",
    description:
      "Released 300 units of Zithromax (Azithromycin 500mg) from quarantine following secondary QA laboratory clearance certificate #QA-9921.",
    ipAddress: "192.168.1.108",
  },

  // --- Admin Security Authentication (Admin Only) ---
  {
    id: "LOG-2026-0131",
    timestamp: "2026-08-25 08:30:00",
    userId: 1,
    userName: "Sarah Jenkins",
    userRole: ROLES.ADMIN,
    visibleRoles: [ROLES.ADMIN],
    action: "USER_LOGIN",
    actionLabel: "User Authentication Success",
    module: "Security & Access",
    severity: "info",
    target: "admin_sarah",
    facility: "Exakt Central General Hospital",
    description:
      "Successful administrative login session established via secure role portal.",
    ipAddress: "192.168.1.102",
  },

  // --- Admin Facility Management (Admin Only) ---
  {
    id: "LOG-2026-0130",
    timestamp: "2026-08-24 14:50:30",
    userId: 1,
    userName: "Sarah Jenkins",
    userRole: ROLES.ADMIN,
    visibleRoles: [ROLES.ADMIN],
    action: "FACILITY_UPDATED",
    actionLabel: "Facility Operational Status Updated",
    module: "Facility Management",
    severity: "info",
    target: "FAC-004",
    facility: "Exakt Westside Emergency Hub",
    description:
      "Updated storage capacity and active warehouse license verification for Exakt Westside Emergency Hub.",
    ipAddress: "192.168.1.102",
  },

  // --- Pharmacist Master SKU Addition ---
  {
    id: "LOG-2026-0129",
    timestamp: "2026-08-24 10:20:15",
    userId: 3,
    userName: "Maria Santos",
    userRole: ROLES.PHARMACIST,
    visibleRoles: [ROLES.ADMIN, ROLES.PHARMACIST],
    action: "SKU_CREATED",
    actionLabel: "New SKU Catalog Entry Added",
    module: "SKU Catalog",
    severity: "success",
    target: "ATOR020-TAB-100",
    facility: "Exakt Central General Hospital",
    description:
      "Created master catalog entry for Lipitor (Atorvastatin Calcium 20mg Tablet, Box of 100).",
    ipAddress: "192.168.1.108",
  },
];
