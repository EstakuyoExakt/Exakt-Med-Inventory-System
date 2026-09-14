import {
  isRequired,
  isUnique,
  runValidation,
} from "./rules";

/**
 * Validate Batch Form (Receiving Batch)
 */
export const validateBatchForm = (
  formData = {},
  { batchList = [], excludeId = null } = {}
) => {
  let batchNumErr = isRequired(
    formData.batchNumber,
    "Batch number is required."
  );
  if (!batchNumErr) {
    batchNumErr = isUnique(
      formData.batchNumber,
      batchList,
      "batchNumber",
      excludeId,
      "Batch number already exists in inventory."
    );
  }

  let expiryErr = isRequired(formData.expiryDate, "Expiry date is required.");
  if (!expiryErr && formData.manufacturingDate && formData.expiryDate) {
    if (new Date(formData.expiryDate) <= new Date(formData.manufacturingDate)) {
      expiryErr = "Expiry date must be after manufacturing date.";
    }
  }

  let quantityErr = null;
  if (Number(formData.quantity) <= 0) {
    quantityErr = "Received quantity must be greater than 0.";
  }

  let quarantineErr = null;
  if (formData.isQuarantined && !formData.quarantineReason?.trim()) {
    quarantineErr = "Please specify a quarantine reason.";
  }

  const errors = {
    batchNumber: batchNumErr,
    manufacturingDate: isRequired(
      formData.manufacturingDate,
      "Manufacturing date is required."
    ),
    expiryDate: expiryErr,
    quantity: quantityErr,
    quarantineReason: quarantineErr,
  };

  return runValidation(errors);
};
