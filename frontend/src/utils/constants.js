// Batch Management
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

// SKU Management
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

export const DEFAULT_FORM_DATA = {
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
