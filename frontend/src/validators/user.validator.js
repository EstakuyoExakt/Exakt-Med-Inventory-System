import { isRequired, minLength, isEmail, isUnique, runValidation } from "./rules";

/**
 * Validate User Form (Add or Edit)
 * Used across both userManagement.jsx and selectFacility.jsx
 */
export const validateUserForm = (
  formData = {},
  { userList = [], excludeId = null, isEdit = false, checkRoleAndStatus = true } = {}
) => {
  let usernameError =
    isRequired(formData.username, "Username is required.") ||
    minLength(formData.username, 3, "Username must be at least 3 characters.");

  if (!usernameError) {
    usernameError = isUnique(
      formData.username,
      userList,
      "username",
      excludeId,
      "Username is already taken."
    );
  }

  let emailError =
    isRequired(formData.email, "Email address is required.") ||
    isEmail(formData.email, "Please enter a valid email address.");

  if (!emailError) {
    emailError = isUnique(
      formData.email,
      userList,
      "email",
      excludeId,
      "Email address is already in use."
    );
  }

  const errors = {
    name: isRequired(formData.name, "Full name is required."),
    username: usernameError,
    email: emailError,
  };

  if (checkRoleAndStatus) {
    errors.role = isRequired(formData.role, "Role is required.");
    errors.status = isRequired(formData.status, "Status is required.");
  }

  if (!isEdit) {
    errors.password =
      isRequired(formData.password, "Password is required for new users.") ||
      minLength(formData.password, 6, "Password must be at least 6 characters.");
  }

  return runValidation(errors);
};
