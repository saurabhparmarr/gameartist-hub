import { Image } from "lucide-react";
import { useState } from "react";

function ArtworkCard({ artwork, onClick }) {
  const [imageFailed, setImageFailed] = useState(!artwork.imageUrl);

  return (
    <button
      className="artwork-card"
      type="button"
      onClick={() => onClick(artwork)}
      aria-label={`View ${artwork.title}`}
    >
      <span className="artwork-card-image">
        {imageFailed ? (
          <span className="artwork-placeholder"><Image size={27} /><span>Artwork preview unavailable</span></span>
        ) : (
          <img
            src={artwork.imageUrl}
            alt={artwork.title}
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        )}
        <span className="artwork-card-open">View artwork</span>
      </span>
      <span className="artwork-card-info">
        <strong>{artwork.title}</strong>
        <span>{artwork.category}</span>
      </span>
    </button>
  );
}

export default ArtworkCard;
