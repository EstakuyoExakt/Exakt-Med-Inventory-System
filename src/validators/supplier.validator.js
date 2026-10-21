import { isRequired, isEmail, isUnique, runValidation } from "./rules";

/**
 * Validate Supplier Form (Add or Edit)
 */
export const validateSupplierForm = (
  formData = {},
  { supplierList = [], excludeId = null } = {}
) => {
  let emailError =
    isRequired(formData.email, "Email address is required.") ||
    isEmail(formData.email, "Please enter a valid email address.");

  if (!emailError) {
    emailError = isUnique(
      formData.email,
      supplierList,
      "email",
      excludeId,
      "Email address is already used by another supplier."
    );
  }

  const errors = {
    name: isRequired(formData.name, "Supplier name is required."),
    contactPerson: isRequired(
      formData.contactPerson,
      "Contact person name is required."
    ),
    email: emailError,
    paymentTerms: isRequired(
      formData.paymentTerms,
      "Payment terms are required."
    ),
    status: isRequired(formData.status, "Status is required."),
  };

  return runValidation(errors);
};
