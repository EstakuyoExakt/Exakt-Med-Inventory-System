import { isRequired, minLength, isEmail, runValidation } from "./rules";

/**
 * Validate Facility Form (Add or Edit)
 */
export const validateFacilityForm = (
  formData = {},
  { activeProjectId = null, checkProjectId = false } = {}
) => {
  const errors = {
    name:
      isRequired(formData.name, "Facility name is required.") ||
      minLength(formData.name, 2, "Facility name must be at least 2 characters."),
    contactPerson: isRequired(
      formData.contactPerson,
      "Contact person is required."
    ),
    email:
      isRequired(formData.email, "Email address is required.") ||
      isEmail(formData.email, "Please enter a valid email address."),
    phone: isRequired(formData.phone, "Phone number is required."),
    address: isRequired(formData.address, "Physical address is required."),
  };

  if (checkProjectId && !activeProjectId) {
    errors.general =
      "An active project is required to create a facility. Please select a project first.";
  }

  return runValidation(errors);
};
