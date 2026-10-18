import { Search } from "lucide-react";

function EmptyState({ title, message, actionLabel, onAction }) {
  return (
    <div className="empty-state">
      <span><Search size={23} /></span>
      <h3>{title}</h3>
      <p>{message}</p>
      {actionLabel && onAction && (
        <button className="button button-outline" type="button" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
