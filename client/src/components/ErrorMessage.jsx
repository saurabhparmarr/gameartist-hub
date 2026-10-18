import { AlertCircle } from "lucide-react";

function ErrorMessage({ message, onRetry, compact = false }) {
  return (
    <div className={`api-error${compact ? " api-error-compact" : ""}`} role="alert">
      <AlertCircle size={compact ? 15 : 19} />
      <span>{message}</span>
      {onRetry && (
        <button className="text-link" type="button" onClick={onRetry}>Try again</button>
      )}
    </div>
  );
}

export default ErrorMessage;
