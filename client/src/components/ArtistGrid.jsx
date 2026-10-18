import ArtistCard from "./ArtistCard.jsx";
import EmptyState from "./EmptyState.jsx";
import ErrorMessage from "./ErrorMessage.jsx";
import LoadingSkeleton from "./LoadingSkeleton.jsx";

function ArtistGrid({ artists, isLoading, error, onClearFilters, onRetry }) {
  if (isLoading) return <LoadingSkeleton />;

  if (error) {
    return <ErrorMessage message={error} onRetry={onRetry} />;
  }

  if (artists.length === 0) {
    return (
      <EmptyState
        title="No artists found"
        message="Try changing your search or filters to find more artists."
        actionLabel="Clear search and filters"
        onAction={onClearFilters}
      />
    );
  }

  return (
    <div className="artist-grid directory-grid">
      {artists.map((artist) => <ArtistCard key={artist._id} artist={artist} />)}
    </div>
  );
}

export default ArtistGrid;
