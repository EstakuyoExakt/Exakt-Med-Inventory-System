import { isRequired, minLength, isUnique, runValidation } from "./rules";

/**
 * Validate Project Form (Add or Edit)
 */
export const validateProjectForm = (
  { name } = {},
  { projectList = [], excludeId = null, isEdit = false } = {}
) => {
  let nameError =
    isRequired(name, "Project name is required.") ||
    minLength(name, 2, "Project name must be at least 2 characters long.");

  if (!nameError) {
    const duplicateMsg = isEdit
      ? "Another project with this name already exists."
      : "A project with this name already exists.";
    nameError = isUnique(name, projectList, "name", excludeId, duplicateMsg);
  }

  return runValidation({ name: nameError });
};
