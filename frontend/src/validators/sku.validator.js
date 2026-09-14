import {
  isRequired,
  isUnique,
  isPositiveNumber,
  runValidation,
} from "./rules";

/**
 * Validate SKU Form (Add or Edit)
 */
export const validateSkuForm = (
  formData = {},
  { currentFacilitySkus = [], excludeId = null, currentFacilityName = "" } = {}
) => {
  let skuError = isRequired(formData.sku, "SKU code is required.");
  if (!skuError) {
    skuError = isUnique(
      formData.sku,
      currentFacilitySkus,
      "sku",
      excludeId,
      `SKU code already exists in ${currentFacilityName || "this facility"}.`
    );
  }

  const minLevelErr = isPositiveNumber(
    formData.minimumLevel,
    "Minimum level cannot be negative."
  );

  let reorderLevelErr = null;
  if (Number(formData.reorderLevel) <= Number(formData.minimumLevel)) {
    reorderLevelErr = "Reorder level must be greater than minimum level threshold.";
  }

  let maxLevelErr = null;
  if (Number(formData.maximumLevel) <= Number(formData.reorderLevel)) {
    maxLevelErr = "Maximum capacity must be greater than reorder level threshold.";
  }

  const errors = {
    medicineId: isRequired(
      formData.medicineId,
      "Please select a medicine from the library."
    ),
    sku: skuError,
    dosageForm: isRequired(formData.dosageForm, "Dosage form is required."),
    packagingUnit: isRequired(
      formData.packagingUnit,
      "Packaging unit is required."
    ),
    minimumLevel: minLevelErr,
    reorderLevel: reorderLevelErr,
    maximumLevel: maxLevelErr,
  };

  return runValidation(errors);
};
