import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  Children,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";

/**
 * Custom Dropdown Component (No native <select> tag)
 *
 * Supports:
 * - `options` prop: array of objects `{ value, label, disabled }` or primitives `["Option 1", "Option 2"]`
 * - JSX `<option>` children: `<option value="1">One</option>`
 * - Custom labels, required indicators, placeholders, error messages, and helper text
 * - Synthetic change events (`e.target.value` and `e.target.name`) for seamless form compatibility
 * - Click-outside detection, keyboard Escape handling, and smooth animated chevron
 * - Portal rendering (`usePortal = true`, default) to mount the dropdown list on `document.body`
 *   with high z-index and automatic upward/downward flip positioning to avoid overflow-y clipping in modals.
 */
function Dropdown({
  label,
  id,
  name,
  value,
  onChange,
  options = [],
  placeholder,
  error,
  errorClassName = "",
  helperText,
  disabled = false,
  required = false,
  size = "md", // "sm" | "md" | "lg"
  className = "",
  selectClassName = "",
  usePortal = true,
  children,
  ...props
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuCoords, setMenuCoords] = useState(null);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  // Position calculation for portal floating menu
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const estimatedMenuHeight = 240; // max-h-60 is 240px

    const shouldOpenUpward =
      spaceBelow < estimatedMenuHeight && spaceAbove > spaceBelow;

    setMenuCoords({
      top: shouldOpenUpward ? rect.top - 6 : rect.bottom + 6,
      left: rect.left,
      width: rect.width,
      openUpward: shouldOpenUpward,
    });
  }, []);

  // Update position on scroll/resize when open
  useEffect(() => {
    if (!isOpen || !usePortal) return;
    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen, usePortal, updatePosition]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedInsideTrigger =
        containerRef.current && containerRef.current.contains(event.target);
      const clickedInsideMenu =
        menuRef.current && menuRef.current.contains(event.target);

      if (!clickedInsideTrigger && !clickedInsideMenu) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Normalize options from either `options` prop or JSX `<option>` children
  const parsedOptions = useMemo(() => {
    if (options && options.length > 0) {
      return options.map((opt) => {
        if (typeof opt === "object" && opt !== null) {
          return {
            value: opt.value !== undefined ? opt.value : opt.id,
            label: opt.label ?? opt.name ?? String(opt.value ?? ""),
            disabled: opt.disabled,
          };
        }
        return {
          value: opt,
          label: String(opt),
          disabled: false,
        };
      });
    }

    if (children) {
      const extracted = [];
      const traverse = (items) => {
        Children.forEach(items, (child) => {
          if (!child) return;
          if (child.type === React.Fragment) {
            traverse(child.props?.children);
          } else if (child.props) {
            extracted.push({
              value:
                child.props.value !== undefined
                  ? child.props.value
                  : child.props.children,
              label: child.props.children ?? child.props.value,
              disabled: child.props.disabled,
            });
          }
        });
      };

      traverse(children);
      return extracted;
    }

    return [];
  }, [options, children]);

  // Include placeholder if provided and not already present as an empty value option
  const allOptions = useMemo(() => {
    if (
      placeholder &&
      !parsedOptions.some(
        (opt) => opt.value === "" || opt.value === null || opt.value === undefined,
      )
    ) {
      return [{ value: "", label: placeholder, isPlaceholder: true }, ...parsedOptions];
    }
    return parsedOptions;
  }, [parsedOptions, placeholder]);

  // Find currently selected option
  const selectedOption = useMemo(() => {
    if (value === undefined || value === null || value === "") {
      const emptyOpt = allOptions.find(
        (opt) => opt.value === "" || opt.value === null,
      );
      return emptyOpt || null;
    }
    return (
      allOptions.find((opt) => String(opt.value) === String(value)) || null
    );
  }, [allOptions, value]);

  const handleSelect = (opt) => {
    if (disabled || opt.disabled) return;
    setIsOpen(false);
    if (onChange) {
      const syntheticEvent = {
        target: {
          name: name || id || "",
          value: opt.value,
        },
      };
      onChange(syntheticEvent, opt.value);
    }
  };

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen((prev) => !prev);
  };

  const sizeClasses = {
    sm: "py-1.5 px-3 text-xs",
    md: "py-2 px-3.5 text-sm",
    lg: "py-2.5 px-4 text-base",
  }[size] || "py-2 px-3.5 text-sm";

  const menuContent = isOpen && (!usePortal || menuCoords) && (
    <div
      ref={menuRef}
      role="listbox"
      style={
        usePortal && menuCoords
          ? {
              position: "fixed",
              top: menuCoords.openUpward ? undefined : `${menuCoords.top}px`,
              bottom: menuCoords.openUpward
                ? `${window.innerHeight - menuCoords.top}px`
                : undefined,
              left: `${menuCoords.left}px`,
              width: `${menuCoords.width}px`,
            }
          : undefined
      }
      className={`${
        usePortal
          ? "fixed z-[99999] shadow-2xl"
          : "absolute left-0 right-0 z-[60] mt-1.5 min-w-full shadow-lg"
      } bg-white border border-gray-200 rounded-xl max-h-60 overflow-y-auto py-1 focus:outline-none custom-scrollbar animate-in fade-in duration-100`}
    >
      {allOptions.length === 0 ? (
        <div className="px-3 py-2 text-xs text-gray-400 text-center italic">
          No options available
        </div>
      ) : (
        allOptions.map((opt, idx) => {
          const isSelected =
            selectedOption &&
            String(selectedOption.value) === String(opt.value);

          return (
            <button
              key={`${opt.value}-${idx}`}
              type="button"
              role="option"
              aria-selected={isSelected}
              disabled={opt.disabled}
              onClick={() => handleSelect(opt)}
              className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs md:text-sm transition-colors cursor-pointer select-none ${
                opt.disabled
                  ? "opacity-40 cursor-not-allowed text-gray-400"
                  : isSelected
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span className="truncate">{opt.label}</span>
              {isSelected && (
                <Check className="w-4 h-4 text-blue-600 shrink-0 ml-2" />
              )}
            </button>
          );
        })
      )}
    </div>
  );

  return (
    <div
      ref={containerRef}
      className={`relative ${isOpen && !usePortal ? "z-50" : ""} ${className || "w-full"}`}
    >
      {/* Optional Form Label */}
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Hidden input for form tracking */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={value ?? ""}
          disabled={disabled}
        />
      )}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        onClick={handleToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between gap-2 rounded-lg border bg-white text-left font-normal shadow-xs outline-none transition duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
          error
            ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
            : isOpen
              ? "border-blue-500 ring-2 ring-blue-500/20"
              : "border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        } ${sizeClasses} ${selectClassName}`}
        {...props}
      >
        <span
          className={`block truncate ${
            selectedOption && selectedOption.value !== ""
              ? "text-gray-900 font-medium"
              : "text-gray-400 font-normal"
          }`}
        >
          {selectedOption
            ? selectedOption.label
            : placeholder || "Select an option..."}
        </span>

        <ChevronDown
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-blue-600" : ""
          }`}
        />
      </button>

      {/* Custom Popover Dropdown Menu (via Portal so it sits on top of modals) */}
      {usePortal && typeof document !== "undefined"
        ? createPortal(menuContent, document.body)
        : menuContent}

      {/* Error or Helper Message */}
      {error ? (
        <p
          className={
            errorClassName ||
            `mt-1 ${size === "sm" ? "text-[11px]" : "text-xs"} text-red-500`
          }
        >
          {error}
        </p>
      ) : helperText ? (
        <p className="mt-1 text-xs text-gray-500">{helperText}</p>
      ) : null}
    </div>
  );
}

export default Dropdown;
