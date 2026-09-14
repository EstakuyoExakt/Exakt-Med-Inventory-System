/**
 * Core Primitive Validation Rules
 * Pure functions returning an error message string or null if valid.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isRequired = (value, message = "This field is required.") => {
  if (value === null || value === undefined) return message;
  if (typeof value === "string" && !value.trim()) return message;
  if (Array.isArray(value) && value.length === 0) return message;
  return null;
};

export const isEmail = (value, message = "Please enter a valid email address.") => {
  if (!value) return null;
  const trimmed = typeof value === "string" ? value.trim() : "";
  return EMAIL_REGEX.test(trimmed) ? null : message;
};

export const minLength = (value, min, message) => {
  if (!value) return null;
  const str = String(value).trim();
  const defaultMsg = `Must be at least ${min} characters.`;
  return str.length >= min ? null : (message || defaultMsg);
};

export const maxLength = (value, max, message) => {
  if (!value) return null;
  const str = String(value).trim();
  const defaultMsg = `Cannot exceed ${max} characters.`;
  return str.length <= max ? null : (message || defaultMsg);
};

export const isPositiveNumber = (value, message = "Value cannot be negative.") => {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return !isNaN(num) && num >= 0 ? null : message;
};

export const isGreaterThan = (value, compareValue, message) => {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  const comp = Number(compareValue);
  const defaultMsg = `Must be greater than ${compareValue}.`;
  return num > comp ? null : (message || defaultMsg);
};

export const isAfterDate = (date, beforeDate, message = "Date must be after the earlier date.") => {
  if (!date || !beforeDate) return null;
  const d1 = new Date(date);
  const d2 = new Date(beforeDate);
  return d1 > d2 ? null : message;
};

export const isUnique = (
  value,
  list = [],
  key = "name",
  excludeId = null,
  message = "This value already exists."
) => {
  if (!value || !Array.isArray(list)) return null;
  const target = String(value).trim().toLowerCase();
  const exists = list.some((item) => {
    if (!item) return false;
    if (excludeId !== null && excludeId !== undefined && item.id === excludeId) {
      return false;
    }
    const itemVal = item[key];
    return itemVal && String(itemVal).trim().toLowerCase() === target;
  });
  return exists ? message : null;
};

/**
 * Filters out null/undefined/empty string errors
 * and returns { isValid: boolean, errors: Object }
 */
export const runValidation = (errors) => {
  const cleaned = Object.entries(errors).reduce((acc, [field, err]) => {
    if (err) acc[field] = err;
    return acc;
  }, {});
  return {
    isValid: Object.keys(cleaned).length === 0,
    errors: cleaned,
  };
};
