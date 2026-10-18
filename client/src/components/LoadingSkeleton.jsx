function LoadingSkeleton({ count = 6 }) {
  return (
    <div className="artist-grid directory-grid" aria-label="Loading artists" aria-busy="true">
      {Array.from({ length: count }, (_, index) => (
        <div className="artist-skeleton" key={index}>
          <div className="skeleton-block skeleton-art" />
          <div className="artist-card-content">
            <div className="skeleton-heading">
              <span className="skeleton-block skeleton-avatar" />
              <span className="skeleton-lines"><span className="skeleton-block" /><span className="skeleton-block" /></span>
            </div>
            <span className="skeleton-block skeleton-skills" />
            <span className="skeleton-block skeleton-footer" />
          </div>
        </div>
      ))}
      <span className="sr-only" role="status">Loading artists…</span>
    </div>
  );
}

export default LoadingSkeleton;
