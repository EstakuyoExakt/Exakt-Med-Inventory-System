import { AlertCircle, Trash2, Loader2 } from "lucide-react";
import Modal from "./modal";

/**
 * Reusable Confirmation Modal for Delete Operations.
 * Utilizes Tailwind CSS components from index.css:
 * - .btn-secondary
 * - .btn-danger
 * - .animate-slide-up (via Modal)
 */
function DeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Delete Confirmation",
  itemName = "",
  itemType = "item",
  itemCode = "",
  message = "",
  isDeleting = false,
  error = "",
  confirmText = "Delete",
  cancelText = "Cancel",
  size = "sm",
  children,
}) {
  const handleConfirm = (e) => {
    e?.preventDefault();
    if (onConfirm && !isDeleting) {
      onConfirm();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isDeleting && onClose && onClose()}
      title={title}
      size={size}
    >
      <div className="space-y-4">
        {/* Warning Banner */}
        <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-left">
            <p className="font-semibold text-red-900 text-sm">
              Are you sure you want to delete {itemName ? `"${itemName}"` : `this ${itemType}`}?
            </p>
            <p className="text-red-700 leading-relaxed">
              {message || (
                <>
                  This will permanently remove{" "}
                  {itemName ? (
                    <strong className="font-bold text-red-900">
                      {itemName}
                    </strong>
                  ) : (
                    `this ${itemType}`
                  )}
                  {itemCode && (
                    <span className="font-mono font-semibold ml-1">
                      ({itemCode})
                    </span>
                  )}{" "}
                  from the system. This action cannot be undone.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Optional Custom Slot */}
        {children}

        {/* Actions Footer */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="btn-secondary text-xs"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={handleConfirm}
            className="btn-danger text-xs flex items-center gap-1.5"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>{confirmText}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default DeleteModal;
