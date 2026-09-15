import { useEffect } from "react";
import { CheckCircle2, Check } from "lucide-react";
import Modal from "./modal";

/**
 * Reusable Confirmation & Feedback Modal for Successful Operations.
 * Utilizes Tailwind CSS components from index.css:
 * - .btn-primary
 * - .btn-secondary
 * - .animate-slide-up (via Modal)
 */
function SuccessModal({
  isOpen,
  onClose,
  title = "Operation Successful",
  message = "",
  details = null,
  confirmText = "Done",
  cancelText = "",
  onConfirm = null,
  onCancel = null,
  showCancel = false,
  autoCloseMs = null,
  size = "sm",
  children,
}) {
  // Optional auto-dismiss timer
  useEffect(() => {
    if (!isOpen || !autoCloseMs || autoCloseMs <= 0) return;

    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, autoCloseMs);

    return () => clearTimeout(timer);
  }, [isOpen, autoCloseMs, onClose]);

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    } else if (onClose) {
      onClose();
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else if (onClose) {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size={size}>
      <div className="space-y-4 text-center">
        {/* Success Icon Badge */}
        <div className="flex items-center justify-center pt-2">
          <div className="relative flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 ring-8 ring-emerald-50">
            <CheckCircle2 className="w-8 h-8" />
          </div>
        </div>

        {/* Success Message Header */}
        <div className="space-y-1">
          <p className="font-semibold text-slate-900 text-sm">
            {message || "The requested action has been completed successfully."}
          </p>
        </div>

        {/* Optional Details Box */}
        {details && (
          <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs text-emerald-800 text-left leading-relaxed">
            {typeof details === "string" ? <p>{details}</p> : details}
          </div>
        )}

        {/* Optional Custom Slot */}
        {children}

        {/* Actions Footer */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
          {(showCancel || cancelText) && (
            <button
              type="button"
              onClick={handleCancel}
              className="btn-secondary text-xs"
            >
              {cancelText || "Close"}
            </button>
          )}
          <button
            type="button"
            onClick={handleConfirm}
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default SuccessModal;
