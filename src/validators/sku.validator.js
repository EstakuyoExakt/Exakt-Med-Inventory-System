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
  const minLevelReq = isRequired(
    formData.minimumLevel,
    "Minimum level is required."
  );
  const minLevelErr =
    minLevelReq ||
    isPositiveNumber(
      formData.minimumLevel,
      "Minimum level cannot be negative."
    );

  const reorderLevelReq = isRequired(
    formData.reorderLevel,
    "Reorder level is required."
  );
  let reorderLevelErr = reorderLevelReq;
  if (
    !reorderLevelReq &&
    formData.minimumLevel !== "" &&
    formData.minimumLevel !== null &&
    Number(formData.reorderLevel) <= Number(formData.minimumLevel)
  ) {
    reorderLevelErr = "Reorder level must be greater than minimum level threshold.";
  }

  const maxLevelReq = isRequired(
    formData.maximumLevel,
    "Maximum capacity is required."
  );
  let maxLevelErr = maxLevelReq;
  if (
    !maxLevelReq &&
    formData.reorderLevel !== "" &&
    formData.reorderLevel !== null &&
    Number(formData.maximumLevel) <= Number(formData.reorderLevel)
  ) {
    maxLevelErr = "Maximum capacity must be greater than reorder level threshold.";
  }

  const errors = {
    medicineId: isRequired(
      formData.medicineId,
      "Please select a medicine from the library."
    ),
    brandName: isRequired(formData.brandName, "Brand name is required."),
    minimumLevel: minLevelErr,
    reorderLevel: reorderLevelErr,
    maximumLevel: maxLevelErr,
  };

  return runValidation(errors);
};
