import { ROLES } from "../config/roles";

// ==========================================
// Administration & User Management
// ==========================================
export const DEFAULT_ADMIN_FORM = {
  name: "",
  username: "",
  email: "",
  phone: "",
  password: "exaktpassword",
  status: "Active",
};

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
export const FACILITY_TYPE_OPTIONS = [
  "Main Hospital",
  "Branch Hospital",
  "Central Warehouse",
  "Outpatient Clinic",
  "Emergency Center",
  "Specialty Hospital",
  "Diagnostic Center",
  "Cold Storage Facility",
];

export const DEFAULT_FACILITY_FORM = {
  name: "",
  facilityCode: "",
  type: "Main Hospital",
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
  supplierCode: "",
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

export const DEFAULT_RECEIVE_BATCH = {
  sku: "",
  batchNumber: "",
  manufacturingDate: new Date().toISOString().split("T")[0],
  expiryDate: "",
  quantity: 100,
  location: "Exakt Central General Hospital",
};

// ==========================================
// SKU Management & Stock Actions
// ==========================================
export const FORM_CODES = {
  Tablet: "TAB",
  Capsule: "CAP",
  Syrup: "SYR",
  Suspension: "SUS",
  Inhaler: "INH",
  Injectable: "INJ",
  Ointment: "OIN",
  Drops: "DRP",
};

export const DEFAULT_SKU_FORM_DATA = {
  medicineId: "",
  sku: "",
  brandName: "",
  genericName: "",
  dosage: "",
  type: "Antibiotics",
  dosageForm: "Tablet",
  packagingUnit: "Box of 100 (10x10 Blister)",
  minimumLevel: 50,
  reorderLevel: 150,
  maximumLevel: 1000,
  status: "Active",
};

export const DEFAULT_STOCK_ADJUSTMENT = {
  type: "ADD", // 'ADD' | 'SUBTRACT' | 'SET'
  amount: 10,
  reason: ADJUSTMENT_REASONS[0],
  notes: "",
};

export const DEFAULT_STOCK_TRANSFER = {
  targetLocation: "Exakt Northside Medical Wing",
  transferQuantity: 10,
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
