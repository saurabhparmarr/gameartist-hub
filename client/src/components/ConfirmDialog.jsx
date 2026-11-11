import { useEffect, useId, useRef } from "react";
import { AlertTriangle } from "lucide-react";

function ConfirmDialog({ title, message, confirmLabel = "Delete", loadingLabel = "Deleting…", errorMessage, isLoading = false, onConfirm, onCancel }) {
  const dialogRef = useRef(null);
  const cancelButtonRef = useRef(null);
  const dialogId = useId();
  const onCancelRef = useRef(onCancel);
  const isLoadingRef = useRef(isLoading);
  onCancelRef.current = onCancel;
  isLoadingRef.current = isLoading;

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    cancelButtonRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!isLoadingRef.current) onCancelRef.current();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusableElements = dialogRef.current.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusableElements.length) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, []);

  return (
    <div
      className="profile-overlay"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isLoading) onCancel();
      }}
    >
      <section
        ref={dialogRef}
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${dialogId}-title`}
        aria-describedby={`${dialogId}-description`}
        onClick={(event) => event.stopPropagation()}
      >
        <span className="confirm-dialog-icon"><AlertTriangle size={22} /></span>
        <h2 id={`${dialogId}-title`}>{title}</h2>
        <p id={`${dialogId}-description`}>{message}</p>
        {errorMessage && <p className="confirm-dialog-error" role="alert">{errorMessage}</p>}
        <div className="confirm-dialog-actions">
          <button ref={cancelButtonRef} className="button button-outline" type="button" onClick={onCancel} disabled={isLoading}>Cancel</button>
          <button className="button button-danger" type="button" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? loadingLabel : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

export default ConfirmDialog;
