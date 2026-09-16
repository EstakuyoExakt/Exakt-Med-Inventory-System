import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Check, X, Loader2 } from "lucide-react";

/**
 * Reusable Traditional ComboBox Component
 * 
 * Supports:
 * - Direct input typing & real-time search filtering
 * - Server-side / async search via onSearch & isLoading
 * - Keyboard navigation (ArrowUp, ArrowDown, Enter, Escape, Tab)
 * - Custom label/value getters and option rendering
 * - Clearable selection
 * - Click outside detection & automatic reset
 * - Error states & accessibility attributes
 */
function ComboBox({
  options = [],
  value = "",
  onChange,
  onSelect,
  onSearch,
  isLoading = false,
  loadingText = "Searching...",
  debounceMs = 300,
  placeholder = "Select or search...",
  label = "",
  labelClassName = "",
  error = "",
  name = "",
  id = "",
  required = false,
  disabled = false,
  clearable = true,
  className = "",
  getOptionLabel = (opt) =>
    opt?.label ?? opt?.name ?? opt?.genericName ?? String(opt ?? ""),
  getOptionValue = (opt) => opt?.value ?? opt?.id ?? opt,
  getOptionSubtext = (opt) => opt?.dosage ?? opt?.description ?? opt?.subtext ?? "",
  getDisplayValue,
  renderOption,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listboxRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const lastSelectedOptionRef = useRef(null);

  // Clear debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Helper to format the displayed text for a selected option
  const formatOptionDisplay = useMemo(() => {
    return (opt) => {
      if (!opt) return "";
      if (getDisplayValue) return getDisplayValue(opt);
      const optLabel = getOptionLabel(opt);
      const optSubtext = getOptionSubtext(opt);
      return optSubtext ? `${optLabel} — ${optSubtext}` : optLabel;
    };
  }, [getDisplayValue, getOptionLabel, getOptionSubtext]);

  // Find currently selected option object
  const selectedOption = useMemo(() => {
    if (value === "" || value === null || value === undefined) {
      lastSelectedOptionRef.current = null;
      return null;
    }
    const found = options.find(
      (opt) => String(getOptionValue(opt)) === String(value)
    );
    if (found) {
      lastSelectedOptionRef.current = found;
      return found;
    }
    // Fall back to remembered selected option if value matches
    if (
      lastSelectedOptionRef.current &&
      String(getOptionValue(lastSelectedOptionRef.current)) === String(value)
    ) {
      return lastSelectedOptionRef.current;
    }
    return null;
  }, [options, value, getOptionValue]);

  // Synchronize input value with selectedOption when not actively typing
  useEffect(() => {
    if (!isSearching) {
      setInputValue(selectedOption ? formatOptionDisplay(selectedOption) : "");
    }
  }, [selectedOption, isSearching, formatOptionDisplay]);

  // Filter options based on typed input
  const filteredOptions = useMemo(() => {
    // If external async search handler is provided, options are managed externally
    if (onSearch) return options;
    if (!isSearching || !inputValue.trim()) return options;
    const query = inputValue.toLowerCase().trim();
    return options.filter((opt) => {
      const optLabel = getOptionLabel(opt)?.toLowerCase() || "";
      const optSubtext = getOptionSubtext(opt)?.toLowerCase() || "";
      return optLabel.includes(query) || optSubtext.includes(query);
    });
  }, [options, inputValue, isSearching, onSearch, getOptionLabel, getOptionSubtext]);

  // Close and reset on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target)
      ) {
        setIsOpen(false);
        setIsSearching(false);
        setInputValue(
          selectedOption ? formatOptionDisplay(selectedOption) : ""
        );
        if (onSearch && isSearching) {
          onSearch("");
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedOption, formatOptionDisplay, onSearch, isSearching]);

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && listboxRef.current && highlightedIndex >= 0) {
      const activeEl = listboxRef.current.children[highlightedIndex];
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleInputChange = (e) => {
    const nextVal = e.target.value;
    setInputValue(nextVal);
    setIsSearching(true);
    setIsOpen(true);
    setHighlightedIndex(0);

    if (onSearch) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        onSearch(nextVal);
      }, debounceMs);
    }
  };

  const handleFocus = (e) => {
    if (disabled) return;
    setIsOpen(true);
    // Select input text so the user can easily start typing a new query
    e.target.select();
  };

  const handleSelect = (option) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    const val = getOptionValue(option);
    lastSelectedOptionRef.current = option;
    if (onChange) {
      onChange({ target: { name, value: val } }, option);
    }
    if (onSelect) {
      onSelect(option);
    }
    setIsSearching(false);
    setInputValue(formatOptionDisplay(option));
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    lastSelectedOptionRef.current = null;
    if (onChange) {
      onChange({ target: { name, value: "" } }, null);
    }
    if (onSelect) {
      onSelect(null);
    }
    if (onSearch) {
      onSearch("");
    }
    setInputValue("");
    setIsSearching(false);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleToggleDropdown = (e) => {
    e.stopPropagation();
    if (disabled) return;
    if (!isOpen) {
      setIsOpen(true);
      inputRef.current?.focus();
    } else {
      setIsOpen(false);
      setIsSearching(false);
      setInputValue(selectedOption ? formatOptionDisplay(selectedOption) : "");
      if (onSearch && isSearching) {
        onSearch("");
      }
    }
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!isOpen) {
      if (["ArrowDown", "ArrowUp", "Enter"].includes(e.key)) {
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex(0);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (
          highlightedIndex >= 0 &&
          highlightedIndex < filteredOptions.length
        ) {
          handleSelect(filteredOptions[highlightedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setIsSearching(false);
        setInputValue(
          selectedOption ? formatOptionDisplay(selectedOption) : ""
        );
        if (onSearch && isSearching) {
          onSearch("");
        }
        break;
      case "Tab":
        setIsOpen(false);
        setIsSearching(false);
        setInputValue(
          selectedOption ? formatOptionDisplay(selectedOption) : ""
        );
        break;
      default:
        break;
    }
  };

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {label && (
        <label
          htmlFor={id}
          className={`block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 ${labelClassName}`}
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Main Traditional ComboBox Input */}
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-disabled={disabled}
          disabled={disabled}
          value={inputValue}
          placeholder={placeholder}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          className={`input pr-16 bg-white text-sm ${
            disabled ? "opacity-50 cursor-not-allowed bg-gray-50" : ""
          } ${
            error
              ? "border-red-500 focus:border-red-500 focus:ring-red-500/30"
              : isOpen
                ? "border-blue-500 ring-2 ring-blue-500/30"
                : ""
          }`}
        />

        {/* Action Controls on right of input */}
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isLoading && (
            <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin mr-0.5" />
          )}
          {clearable && (selectedOption || inputValue) && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            onClick={handleToggleDropdown}
            disabled={disabled}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            title={isOpen ? "Close dropdown" : "Open dropdown"}
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                isOpen ? "rotate-180 text-blue-600" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Floating Dropdown Options Panel (No secondary search bar) */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full rounded-xl bg-white border border-gray-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {isLoading && filteredOptions.length > 0 && (
            <div className="px-3.5 py-1.5 bg-blue-50/70 border-b border-blue-100/70 flex items-center gap-2 text-xs text-blue-600 font-medium">
              <Loader2 className="w-3 h-3 animate-spin shrink-0" />
              <span>{loadingText}</span>
            </div>
          )}

          <ul
            ref={listboxRef}
            role="listbox"
            className="max-h-60 overflow-y-auto py-1 text-sm divide-y divide-gray-50"
          >
            {isLoading && filteredOptions.length === 0 ? (
              <li className="px-4 py-6 flex flex-col items-center justify-center gap-2 text-xs text-blue-600">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                <span>{loadingText}</span>
              </li>
            ) : filteredOptions.length > 0 ? (
              filteredOptions.map((opt, idx) => {
                const optVal = getOptionValue(opt);
                const optLabel = getOptionLabel(opt);
                const optSubtext = getOptionSubtext(opt);
                const isSelected =
                  String(optVal) === String(value);
                const isHighlighted = idx === highlightedIndex;

                return (
                  <li
                    key={optVal ?? idx}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`px-3.5 py-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                      isHighlighted
                        ? "bg-blue-50/80 text-blue-900"
                        : "text-gray-800 hover:bg-gray-50"
                    } ${isSelected ? "font-semibold text-blue-700 bg-blue-50/40" : ""}`}
                  >
                    {renderOption ? (
                      renderOption(opt, isSelected, isHighlighted)
                    ) : (
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="truncate text-sm">{optLabel}</div>
                        {optSubtext && (
                          <div className="truncate text-xs text-gray-400 mt-0.5">
                            {optSubtext}
                          </div>
                        )}
                      </div>
                    )}

                    {isSelected && (
                      <Check className="w-4 h-4 text-blue-600 shrink-0" />
                    )}
                  </li>
                );
              })
            ) : (
              <li className="px-4 py-6 text-center text-xs text-gray-400">
                No matching medicines found
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Error Message */}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

export default ComboBox;
