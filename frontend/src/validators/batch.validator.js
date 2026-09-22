import {
  isRequired,
  isUnique,
  runValidation,
} from "./rules";

/**
 * Validate a single Batch item (receiving a single SKU lot)
 */
export const validateBatchItem = (
  item = {},
  { batchList = [], existingEnteredBatches = new Set(), excludeId = null } = {}
) => {
  let batchNumErr = isRequired(
    item.batchNumber,
    "Batch number is required."
  );
  const trimmedBatch = (item.batchNumber || "").trim().toUpperCase();
  if (!batchNumErr) {
    if (
      batchList.some(
        (b) =>
          b.id !== excludeId &&
          (b.batchNumber || "").trim().toUpperCase() === trimmedBatch
      )
    ) {
      batchNumErr = "Batch number already exists in inventory.";
    } else if (existingEnteredBatches.has(trimmedBatch)) {
      batchNumErr = "Duplicate batch number entered in this receipt.";
    }
  }

  let expiryErr = isRequired(item.expiryDate, "Expiry date is required.");
  if (!expiryErr && item.manufacturingDate && item.expiryDate) {
    if (new Date(item.expiryDate) <= new Date(item.manufacturingDate)) {
      expiryErr = "Expiry date must be after manufacturing date.";
    }
  }

  let quantityErr = null;
  if (Number(item.quantity) <= 0) {
    quantityErr = "Received quantity must be greater than 0.";
  }

  let quarantineNotesErr = null;
  if (item.isQuarantined && !item.quarantineNotes?.trim()) {
    quarantineNotesErr = "QA remarks are required when medicine is quarantined.";
  }

  const errors = {
    batchNumber: batchNumErr,
    manufacturingDate: isRequired(
      item.manufacturingDate,
      "Manufacturing date is required."
    ),
    expiryDate: expiryErr,
    quantity: quantityErr,
    quarantineNotes: quarantineNotesErr,
  };

  return runValidation(errors);
};

/**
 * Validate Batch Form (Receiving Batch or Multi-SKU Intake)
 */
export const validateBatchForm = (
  formData = {},
  { batchList = [], excludeId = null } = {}
) => {
  // Multi-SKU receiving format
  if (Array.isArray(formData.items) && formData.items.length > 0) {
    const allErrors = {};
    const enteredBatches = new Set();

    if (!formData.poNumber) {
      allErrors.poNumber = "Please select a Purchase Order (PO).";
    }

    formData.items.forEach((item, idx) => {
      const { errors, isValid } = validateBatchItem(item, {
        batchList,
        existingEnteredBatches: enteredBatches,
        excludeId,
      });

      const trimmed = (item.batchNumber || "").trim().toUpperCase();
      if (trimmed) {
        enteredBatches.add(trimmed);
      }

      if (!isValid) {
        Object.entries(errors).forEach(([field, msg]) => {
          if (msg) {
            allErrors[`item_${idx}_${field}`] = msg;
          }
        });
      }
    });

    return {
      isValid: Object.keys(allErrors).length === 0,
      errors: allErrors,
    };
  }

  // Single batch intake fallback
  return validateBatchItem(formData, { batchList, excludeId });
};

