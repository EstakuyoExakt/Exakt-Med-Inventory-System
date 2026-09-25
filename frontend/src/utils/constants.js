import { ROLES } from "../config/roles";

// ==========================================
// Administration & User Management
// ==========================================
export const DEFAULT_USER_FORM = {
  name: "",
  username: "",
  email: "",
  phone: "",
  role: ROLES.PHARMACIST,
  status: "Active",
  password: "",
  confirmPassword: "",
};

// ==========================================
// Facility Management & Selection
// ==========================================
export const DEFAULT_FACILITY_FORM = {
  name: "",
  facilityCode: "",
  contactPerson: "",
  email: "",
  phone: "",
  address: "",
  status: "Active",
};

// ==========================================
// Supplier Management
// ==========================================
export const PAYMENT_TERMS_OPTIONS = [
  // Immediate & Advance Terms
  "Due Upon Receipt",
  "Cash on Delivery (COD)",
  "COD",
  "Advance Payment",
  "Cash Before Delivery (CBD)",

  // Standard Net Credit Terms
  "Net 7",
  "Net 10",
  "Net 15",
  "Net 30",
  "Net 45",
  "Net 60",
  "Net 90",
  "Net 120",

  // Early Payment Discount Terms
  "1/10 Net 30",
  "2/10 Net 30",
  "2/10 Net 60",

  // Commercial, Institutional & Check Terms
  "End of Month (EOM)",
  "15th of Following Month",
  "30-Day Post-Dated Check (PDC)",
  "60-Day Post-Dated Check (PDC)",
  "Consignment",
  "Letter of Credit (LC)",
];

export const DEFAULT_SUPPLIER_FORM = {
  name: "",
  contactPerson: "",
  email: "",
  phone: "",
  address: "",
  paymentTerms: "Net 30",
  status: "Active",
};

// ==========================================
// Batch Management
// ==========================================
export const ADJUSTMENT_REASONS = [
  "Dispensed",
  "Count Discrepancy",
  "Packaging Compromised",
  "Damaged Goods",
  "Audit Adjustment",
  "Clinical Sample",
  "Return from Department",
  "Other Correction",
];

// ==========================================
// SKU Management & Stock Actions
// ==========================================
export const FORM_CODES = {
  TABLET: "TAB",
  CAPSULE: "CAP",
  SYRUP: "SYR",
  SUSPENSION: "SUS",
  INHALER: "INH",
  INJECTABLE: "INJ",
  INJECTION: "INJ",
  OINTMENT: "OIN",
  CREAM: "CRM",
  SOLUTION: "SOL",
  DROPS: "DRP",
  POWDER: "POW",
  LOTION: "LOT",
  PATCH: "PAT",
  SUPPOSITORY: "SUP",
};

export const DEFAULT_SKU_FORM_DATA = {
  medicineId: "",
  sku: "",
  brandName: "",
  genericName: "",
  dosage: "",
  dosageForm: "",
  packagingUnit: "",
  minimumLevel: 50,
  reorderLevel: 150,
  maximumLevel: 1000,
};

export const DEFAULT_STOCK_ADJUSTMENT = {
  type: "ADD", // 'ADD' | 'SUBTRACT' | 'SET'
  amount: 10,
  reason: ADJUSTMENT_REASONS[0],
  notes: "",
};

// ==========================================
// Order Request / Procurement Management
// ==========================================
export const DEFAULT_ORDER_FORM = {
  supplierId: 1,
  targetFacility: "",
  priority: "Normal", // 'Urgent' | 'Normal'
  totalCost: "",
  notes: "",
  items: [],
};
