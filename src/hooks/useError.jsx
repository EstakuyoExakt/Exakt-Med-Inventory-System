import { useState, useCallback } from "react";

/**
 * Custom hook for standardizing form error state, validation feedback,
 * and API error resolution across components.
 * 
 * @param {Object} initialErrors - Initial error object (default: {})
 * @returns {Object} Error state and helper functions
 */
export function useError(initialErrors = {}) {
  const [errors, setErrors] = useState(initialErrors);

  /**
   * Set error for a specific field or general error
   */
  const setError = useCallback((field, message) => {
    setErrors((prev) => ({
      ...prev,
      [field]: message,
    }));
  }, []);

  /**
   * Clear error for one specific field (and optionally general error)
   */
  const clearError = useCallback((field) => {
    setErrors((prev) => {
      if (!prev[field] && !prev.general) return prev;
      const updated = { ...prev };
      delete updated[field];
      return updated;
    });
  }, []);

  /**
   * Clear all errors
   */
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  /**
   * Input change handler that automatically updates form data
   * and clears the specific field's error and general error.
   */
  const handleInputChange = useCallback(
    (e, setFormData) => {
      const { name, value, type, checked } = e.target;
      const fieldValue = type === "checkbox" ? checked : value;

      if (typeof setFormData === "function") {
        setFormData((prev) => ({ ...prev, [name]: fieldValue }));
      }

      setErrors((prev) => {
        if (!prev[name] && !prev.general) return prev;
        const updated = { ...prev };
        delete updated[name];
        delete updated.general;
        return updated;
      });
    },
    []
  );

  /**
   * Normalizes and extracts error messages from API responses
   * (e.g. Spring Boot validation details, error messages, or fallback).
   */
  const handleApiError = useCallback((err, fallbackMessage = "An unexpected error occurred. Please try again.") => {
    console.error("API Error encountered:", err);

    const validationDetails = err?.response?.data?.details;
    const serverMessage =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      (typeof err?.response?.data === "string" ? err.response.data : null) ||
      err?.message;

    if (validationDetails && typeof validationDetails === "object") {
      setErrors(validationDetails);
      return validationDetails;
    }

    const message = serverMessage || fallbackMessage;
    setErrors((prev) => ({
      ...prev,
      general: message,
    }));

    return { general: message };
  }, []);

  return {
    errors,
    setErrors,
    setError,
    clearError,
    clearErrors,
    handleInputChange,
    handleApiError,
    hasErrors: Object.keys(errors).length > 0,
  };
}

export default useError;
