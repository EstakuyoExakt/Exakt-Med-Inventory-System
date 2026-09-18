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
  password: "exaktpassword",
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
  "Net 15",
  "Net 30",
  "Net 45",
  "Net 60",
  "COD",
  "Advance Payment",
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
  "Physical Cycle Count Discrepancy",
  "Damaged Goods / Packaging Compromised",
  "Spillage / Broken Ampoules",
  "Internal Quality Audit Adjustment",
  "Clinical Sample / Laboratory Use",
  "Return from Department",
  "Other Correction",
];

export const QUARANTINE_REASONS = [
  "FDA Regulatory Advisory / Recall",
  "Temperature Excursion during Cold Chain Transit",
  "Suspected Chemical / Physical Contamination",
  "Compromised Packaging / Seal Defect",
  "Pending Secondary Quality Assurance Testing",
  "Discoloration or Precipitation Observed",
  "Other Quality Issue",
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
