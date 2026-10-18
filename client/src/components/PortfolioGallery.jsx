import { useEffect, useState } from "react";
import { X } from "lucide-react";
import ArtworkCard from "./ArtworkCard.jsx";
import EmptyState from "./EmptyState.jsx";

function PortfolioGallery({ artworks }) {
  const [selectedArtwork, setSelectedArtwork] = useState(null);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    if (!selectedArtwork) return undefined;

    function closeOnEscape(event) {
      if (event.key === "Escape") setSelectedArtwork(null);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedArtwork]);

  function openArtwork(artwork) {
    setImageFailed(!artwork.imageUrl);
    setSelectedArtwork(artwork);
  }

  return (
    <>
      {artworks.length ? (
        <div className="portfolio-grid">
          {artworks.map((artwork) => (
            <ArtworkCard key={artwork._id} artwork={artwork} onClick={openArtwork} />
          ))}
        </div>
      ) : (
        <EmptyState title="Portfolio coming soon" message="This artist hasn't shared any portfolio pieces yet." />
      )}
      {selectedArtwork && (
        <div className="profile-overlay" role="presentation" onClick={() => setSelectedArtwork(null)}>
          <section
            className="artwork-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="artwork-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button className="modal-close" type="button" onClick={() => setSelectedArtwork(null)} aria-label="Close artwork preview">
              <X size={20} />
            </button>
            {imageFailed ? (
              <div className="artwork-modal-placeholder"><span>Artwork preview unavailable</span></div>
            ) : (
              <img
                className="artwork-modal-image"
                src={selectedArtwork.imageUrl}
                alt={selectedArtwork.title}
                onError={() => setImageFailed(true)}
              />
            )}
            <div className="artwork-modal-content">
              <span className="artwork-modal-category">{selectedArtwork.category}</span>
              <h2 id="artwork-modal-title">{selectedArtwork.title}</h2>
              {selectedArtwork.description && <p>{selectedArtwork.description}</p>}
              {selectedArtwork.tools?.length > 0 && (
                <div className="skill-list">
                  {selectedArtwork.tools.map((tool) => <span key={tool}>{tool}</span>)}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export default PortfolioGallery;
