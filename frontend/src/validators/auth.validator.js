import { isRequired, runValidation } from "./rules";

/**
 * Validate Login Form
 */
export const validateLoginForm = ({ username, password } = {}) => {
  return runValidation({
    username: isRequired(username, "Username is required."),
    password: isRequired(password, "Password is required."),
  });
};
