import { useState } from "react";
import { ArrowUpRight, Image, MapPin, X } from "lucide-react";
import { Link } from "react-router-dom";

function ArtistCard({ artist, featured = false }) {
  const [showProfile, setShowProfile] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const portfolioItems = artist.recentPortfolio || [];
  const name = artist.user?.name || artist.name || "Game artist";
  const specialty = artist.specialty || "Game artist";
  const featuredArtwork = portfolioItems.find((item) => item.imageUrl)?.imageUrl;
  const image = featuredArtwork || artist.profileImage || artist.image || "/images/artwork-placeholder.svg";
  const profileId = artist._id;

  const cardContent = (
    <>
        <div className="artist-artwork">
          <img
            src={imageFailed ? "/images/artwork-placeholder.svg" : image}
            alt={`${specialty} artwork by ${name}`}
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
          <span className="artwork-label">{specialty}</span>
        </div>
        <div className="artist-card-content">
          <div className="artist-heading">
            <img
              className="artist-avatar"
              src={artist.profileImage || artist.avatar || "/images/artwork-placeholder.svg"}
              alt=""
              loading="lazy"
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = "/images/artwork-placeholder.svg";
              }}
            />
            <div>
              <h3>{name}</h3>
              <p>{specialty}</p>
            </div>
          </div>
          {artist.bio && <p className="artist-card-bio">{artist.bio}</p>}
          {artist.skills?.length > 0 && (
            <div className="skill-list">
              {artist.skills.map((skill) => <span key={skill}>{skill}</span>)}
            </div>
          )}
          {typeof artist.experience === "number" && (
            <span className="artist-experience">{artist.experience} {artist.experience === 1 ? "year" : "years"} experience</span>
          )}
          {profileId && (
            <div className="artist-card-portfolio" aria-label="Portfolio artwork previews">
              {portfolioItems.length > 0 ? portfolioItems.map((item) => (
                <span className="artist-card-portfolio-image" key={item._id}>
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = "/images/artwork-placeholder.svg";
                      }}
                    />
                  ) : (
                    <Image size={16} aria-label="Image not provided" />
                  )}
                </span>
              )) : (
                <span
                  className="artist-card-portfolio-empty"
                >
                  No portfolio artwork yet
                </span>
              )}
            </div>
          )}
          <div className="artist-card-bottom">
            {artist.location ? (
              <span className="artist-location"><MapPin size={14} />{artist.location}</span>
            ) : <span className="artist-location">Location not provided</span>}
            {profileId ? (
              <span className="text-link">
                View profile <ArrowUpRight size={15} />
              </span>
            ) : (
              <button className="text-link" type="button" onClick={() => setShowProfile(true)}>
                View profile <ArrowUpRight size={15} />
              </button>
            )}
          </div>
        </div>
    </>
  );

  return (
    <>
      <article className={`artist-card${featured ? " artist-card-featured" : ""}`}>
        {profileId ? (
          <Link
            className="artist-card-profile-link"
            to={`/artists/${profileId}`}
            aria-label={`View ${name}'s artist profile`}
          >
            {cardContent}
          </Link>
        ) : cardContent}
      </article>
      {showProfile && (
        <div className="profile-overlay" role="presentation" onClick={() => setShowProfile(false)}>
          <section
            className="profile-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`profile-title-${artist.id}`}
            onClick={(event) => event.stopPropagation()}
          >
            <button className="modal-close" type="button" onClick={() => setShowProfile(false)} aria-label="Close profile">
              <X size={20} />
            </button>
            <img
              className="modal-artwork"
              src={imageFailed ? "/images/artwork-placeholder.svg" : image}
              alt={`${specialty} artwork`}
            />
            <div className="modal-profile-heading">
              <img src={artist.avatar || "/images/artwork-placeholder.svg"} alt="" />
              <div>
                <h2 id={`profile-title-${artist.id}`}>{name}</h2>
                <p>{specialty} · {artist.location}</p>
              </div>
            </div>
            <p className="modal-bio">{artist.bio}</p>
            <h3>Tools &amp; workflow</h3>
            <div className="skill-list">
              {artist.tools.map((tool) => <span key={tool}>{tool}</span>)}
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export default ArtistCard;
