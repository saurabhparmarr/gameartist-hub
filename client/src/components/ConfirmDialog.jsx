import { AlertTriangle } from "lucide-react";

function ConfirmDialog({ title, message, confirmLabel = "Delete", loadingLabel = "Deleting…", errorMessage, isLoading = false, onConfirm, onCancel }) {
  return (
    <div className="profile-overlay" role="presentation" onClick={onCancel}>
      <section
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <span className="confirm-dialog-icon"><AlertTriangle size={22} /></span>
        <h2 id="confirm-dialog-title">{title}</h2>
        <p>{message}</p>
        {errorMessage && <p className="confirm-dialog-error" role="alert">{errorMessage}</p>}
        <div className="confirm-dialog-actions">
          <button className="button button-outline" type="button" onClick={onCancel} disabled={isLoading}>Cancel</button>
          <button className="button button-danger" type="button" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? loadingLabel : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

export default ConfirmDialog;
