import {
  isRequired,
  isUnique,
  runValidation,
} from "./rules";

/**
 * Validate an individual Batch Row (when multiple batches are allocated per SKU)
 */
export const validateBatchRow = (
  batch = {},
  { batchList = [], existingEnteredBatches = new Set(), excludeId = null } = {}
) => {
  let batchNumErr = isRequired(
    batch.batchNumber,
    "Batch number is required."
  );
  const trimmedBatch = (batch.batchNumber || "").trim().toUpperCase();
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

  let unitsErr = null;
  const units = Number(batch.units);
  if (
    batch.units === "" ||
    batch.units === undefined ||
    batch.units === null ||
    isNaN(units) ||
    units <= 0
  ) {
    unitsErr = "Units must be greater than 0.";
  }

  let expiryErr = isRequired(batch.expiryDate, "Expiry date is required.");
  if (!expiryErr && batch.manufacturingDate && batch.expiryDate) {
    if (new Date(batch.expiryDate) <= new Date(batch.manufacturingDate)) {
      expiryErr = "Expiry date must be after manufacturing date.";
    }
  }

  let quarantineNotesErr = null;
  if (batch.isQuarantined && !batch.quarantineNotes?.trim()) {
    quarantineNotesErr = "QA remarks are required when batch is quarantined.";
  }

  const errors = {
    batchNumber: batchNumErr,
    units: unitsErr,
    manufacturingDate: isRequired(
      batch.manufacturingDate,
      "Manufacturing date is required."
    ),
    expiryDate: expiryErr,
    quarantineNotes: quarantineNotesErr,
  };

  return runValidation(errors);
};

/**
 * Validate a single Batch item (receiving a single SKU lot - legacy/fallback)
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
  const totalQty = Number(item.quantity || 0);
  if (totalQty <= 0) {
    quantityErr = "Received quantity must be greater than 0.";
  }

  let allocationErr = null;
  let quarantineNotesErr = null;

  if (item.isQuarantined) {
    const accepted = item.acceptedUnits !== undefined ? Number(item.acceptedUnits) : (totalQty - (Number(item.quarantinedUnits) || 0));
    const quarantined = item.quarantinedUnits !== undefined ? Number(item.quarantinedUnits) : totalQty;

    if (isNaN(accepted) || isNaN(quarantined) || accepted < 0 || quarantined < 0) {
      allocationErr = "Allocated units must be valid non-negative numbers.";
    } else if (accepted + quarantined !== totalQty) {
      allocationErr = `Sum of accepted (${accepted}) and quarantined (${quarantined}) units must equal total ordered (${totalQty}).`;
    }

    if (quarantined > 0 && !item.quarantineNotes?.trim()) {
      quarantineNotesErr = "QA remarks are required when units are quarantined.";
    }
  }

  const errors = {
    batchNumber: batchNumErr,
    manufacturingDate: isRequired(
      item.manufacturingDate,
      "Manufacturing date is required."
    ),
    expiryDate: expiryErr,
    quantity: quantityErr,
    quarantineAllocation: allocationErr,
    quarantineNotes: quarantineNotesErr,
  };

  return runValidation(errors);
};

/**
 * Validate Batch Form (Receiving Batch or Multi-SKU Intake with Multi-Batch support)
 */
export const validateBatchForm = (
  formData = {},
  { batchList = [], excludeId = null } = {}
) => {
  // Multi-SKU receiving format
  if (Array.isArray(formData.items) && formData.items.length > 0) {
    const allErrors = {};
    const enteredBatches = new Set();
    let totalGrandAllocated = 0;

    if (!formData.poNumber) {
      allErrors.poNumber = "Please select a Purchase Order (PO).";
    }

    formData.items.forEach((item, itemIdx) => {
      const maxAllowed =
        item.remainingUnits !== undefined
          ? Number(item.remainingUnits)
          : Number(item.quantity || 0);

      const batches =
        Array.isArray(item.batches) && item.batches.length > 0
          ? item.batches
          : null;

      if (batches) {
        // Multi-batch per SKU validation
        const totalAllocated = batches.reduce(
          (sum, b) => sum + (Number(b.units) || 0),
          0,
        );
        totalGrandAllocated += totalAllocated;

        if (totalAllocated > maxAllowed) {
          allErrors[`item_${itemIdx}_allocation`] =
            `Allocated units (${totalAllocated.toLocaleString()}) cannot exceed remaining units to receive (${maxAllowed.toLocaleString()}).`;
        }

        // Validate batches only if this SKU is being received in this delivery session
        if (totalAllocated > 0) {
          batches.forEach((b, bIdx) => {
            const { errors, isValid } = validateBatchRow(b, {
              batchList,
              existingEnteredBatches: enteredBatches,
              excludeId,
            });

            const trimmed = (b.batchNumber || "").trim().toUpperCase();
            if (trimmed) {
              enteredBatches.add(trimmed);
            }

            if (!isValid) {
              Object.entries(errors).forEach(([field, msg]) => {
                if (msg) {
                  allErrors[`item_${itemIdx}_batch_${bIdx}_${field}`] = msg;
                }
              });
            }
          });
        }
      } else {
        // Fallback single-batch per SKU
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
              allErrors[`item_${itemIdx}_${field}`] = msg;
            }
          });
        }
      }
    });

    if (formData.poNumber && totalGrandAllocated <= 0) {
      allErrors.general =
        "Please allocate at least one batch with units to receive.";
    }

    return {
      isValid: Object.keys(allErrors).length === 0,
      errors: allErrors,
    };
  }

  // Single batch intake fallback
  return validateBatchItem(formData, { batchList, excludeId });
};

