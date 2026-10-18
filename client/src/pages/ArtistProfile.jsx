import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, BriefcaseBusiness, Check, Code2, Mail, MapPin, Send, UserRound } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import LoadingSkeleton from "../components/LoadingSkeleton.jsx";
import PortfolioGallery from "../components/PortfolioGallery.jsx";
import {
  getArtistById,
  getArtistPortfolio,
  getRequestErrorMessage,
  getSavedArtists,
  removeSavedArtist,
  saveArtist,
  sendArtistMessage,
} from "../services/artistService.js";

function ArtistProfile() {
  const { id } = useParams();
  const { isAuthenticated, user } = useAuth();
  const [artist, setArtist] = useState(null);
  const [artworks, setArtworks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [profileRetryCount, setProfileRetryCount] = useState(0);
  const [portfolioLoading, setPortfolioLoading] = useState(true);
  const [portfolioError, setPortfolioError] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [savedListLoading, setSavedListLoading] = useState(false);
  const [savedLoading, setSavedLoading] = useState(false);
  const [savedError, setSavedError] = useState("");
  const [showMessageForm, setShowMessageForm] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [messageError, setMessageError] = useState("");
  const [messageSent, setMessageSent] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const artistUserId = artist?.user?._id;
  const artistName = artist?.user?.name || "Artist";
  const canMessage = isAuthenticated && artistUserId && user.id !== artistUserId;
  const canSave = isAuthenticated && user.role === "studio" && artistUserId && user.id !== artistUserId;

  const loadPortfolio = useCallback((userId, signal) => {
    setPortfolioLoading(true);
    setPortfolioError("");
    return getArtistPortfolio(userId, signal)
      .then(setArtworks)
      .catch((error) => {
        if (!signal?.aborted) setPortfolioError(getRequestErrorMessage(error));
      })
      .finally(() => {
        if (!signal?.aborted) setPortfolioLoading(false);
      });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setProfileError("");
    setArtist(null);
    setArtworks([]);

    getArtistById(id, controller.signal)
      .then((profile) => {
        setArtist(profile);
        if (profile.user?._id) return loadPortfolio(profile.user._id, controller.signal);
        setPortfolioLoading(false);
        return undefined;
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setProfileError(getRequestErrorMessage(error));
          setPortfolioLoading(false);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [id, loadPortfolio, profileRetryCount]);

  useEffect(() => {
    if (!canSave) {
      setIsSaved(false);
      setSavedError("");
      return undefined;
    }

    let isActive = true;
    setSavedListLoading(true);
    setSavedError("");
    getSavedArtists()
      .then((savedArtists) => {
        if (isActive) {
          setIsSaved(savedArtists.some((entry) => {
            const savedId = entry.artist?._id || entry.artist;
            return String(savedId) === String(artistUserId);
          }));
        }
      })
      .catch((error) => {
        if (isActive) setSavedError(getRequestErrorMessage(error));
      })
      .finally(() => {
        if (isActive) setSavedListLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [artistUserId, canSave]);

  async function handleSaveToggle() {
    setSavedLoading(true);
    setSavedError("");

    try {
      if (isSaved) await removeSavedArtist(artistUserId);
      else await saveArtist(artistUserId);
      setIsSaved(!isSaved);
    } catch (error) {
      setSavedError(getRequestErrorMessage(error));
    } finally {
      setSavedLoading(false);
    }
  }

  async function handleSendMessage(event) {
    event.preventDefault();
    setMessageError("");
    setMessageSent(false);
    const content = messageText.trim();
    if (!content) {
      setMessageError("Please write a message before sending.");
      return;
    }

    setSendingMessage(true);
    try {
      await sendArtistMessage(artistUserId, content);
      setMessageSent(true);
      setMessageText("");
    } catch (error) {
      setMessageError(getRequestErrorMessage(error));
    } finally {
      setSendingMessage(false);
    }
  }

  if (isLoading) {
    return (
      <section className="directory-content container profile-loading">
        <LoadingSkeleton count={3} />
      </section>
    );
  }

  if (profileError || !artist) {
    return (
      <section className="profile-error-page container">
        <Link className="text-link profile-back" to="/artists"><ArrowLeft size={15} /> Back to artists</Link>
        <ErrorMessage
          message={profileError || "Artist profile not found."}
          onRetry={() => setProfileRetryCount((count) => count + 1)}
        />
      </section>
    );
  }

  return (
    <section className="artist-profile-page">
      <div className="container profile-container">
        <Link className="text-link profile-back" to="/artists"><ArrowLeft size={15} /> Back to artists</Link>
        <div className="artist-profile-card">
          <div className="profile-cover">
            <img src="/images/artwork-placeholder.svg" alt="" />
            <span className="profile-cover-label">GAME ARTIST · PORTFOLIO</span>
          </div>
          <div className="profile-main">
            <div className="profile-identity">
              <img
                className="profile-avatar"
                src={artist.profileImage || "/images/artwork-placeholder.svg"}
                alt={`${artistName} profile`}
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = "/images/artwork-placeholder.svg";
                }}
              />
              <div className="profile-title">
                <span className="eyebrow"><span className="eyebrow-dot" /> INDEPENDENT GAME ARTIST</span>
                <h1>{artistName}</h1>
                <span className="profile-location">
                  <MapPin size={15} /> {artist.location || "Location not provided"}
                </span>
              </div>
              <div className="profile-actions">
                {canSave && (
                  <button className={`button ${isSaved ? "button-outline" : "button-primary"}`} type="button" onClick={handleSaveToggle} disabled={savedLoading || savedListLoading}>
                    {isSaved ? <Check size={16} /> : <UserRound size={16} />}
                    {savedListLoading ? "Checking…" : savedLoading ? "Saving…" : isSaved ? "Saved artist" : "Save artist"}
                  </button>
                )}
                {canMessage ? (
                  <button className="button button-outline" type="button" onClick={() => setShowMessageForm(!showMessageForm)}>
                    <Mail size={16} /> Message artist
                  </button>
                ) : !isAuthenticated ? (
                  <Link className="button button-outline" to="/login" state={{ from: { pathname: `/artists/${id}` } }}>
                    <Mail size={16} /> Log in to contact
                  </Link>
                ) : null}
              </div>
            </div>

            {savedError && <ErrorMessage message={savedError} compact />}
            {showMessageForm && (
              <form className="profile-message-form" onSubmit={handleSendMessage}>
                <label htmlFor="artist-message">Message {artistName}</label>
                <textarea
                  id="artist-message"
                  rows="4"
                  maxLength="5000"
                  value={messageText}
                  onChange={(event) => setMessageText(event.target.value)}
                  placeholder="Tell the artist a little about your project…"
                  required
                />
                <div className="profile-message-footer">
                  <span>{messageText.length}/5000</span>
                  <button className="button button-primary" type="submit" disabled={sendingMessage}>
                    <Send size={15} /> {sendingMessage ? "Sending…" : "Send message"}
                  </button>
                </div>
                {messageError && <ErrorMessage message={messageError} compact />}
                {messageSent && <p className="message-success" role="status">Your message was sent successfully.</p>}
              </form>
            )}
            <div className="profile-details">
              <section className="profile-about">
                <div className="profile-section-heading"><UserRound size={17} /><h2>About</h2></div>
                <p>{artist.bio || "This artist hasn't added a bio yet."}</p>
              </section>
              <div className="profile-facts">
                {typeof artist.experience === "number" && (
                  <div className="profile-fact">
                    <BriefcaseBusiness size={17} />
                    <span><small>EXPERIENCE</small><strong>{artist.experience} {artist.experience === 1 ? "year" : "years"}</strong></span>
                  </div>
                )}
                {artist.location && (
                  <div className="profile-fact">
                    <MapPin size={17} />
                    <span><small>LOCATION</small><strong>{artist.location}</strong></span>
                  </div>
                )}
              </div>
              {artist.skills?.length > 0 && (
                <section className="profile-data-section">
                  <div className="profile-section-heading"><ArrowUpRight size={17} /><h2>Skills</h2></div>
                  <div className="skill-list">{artist.skills.map((skill) => <span key={skill}>{skill}</span>)}</div>
                </section>
              )}
              {artist.software?.length > 0 && (
                <section className="profile-data-section">
                  <div className="profile-section-heading"><Code2 size={17} /><h2>Software &amp; tools</h2></div>
                  <div className="skill-list">{artist.software.map((tool) => <span key={tool}>{tool}</span>)}</div>
                </section>
              )}
            </div>
          </div>
        </div>

        <section className="profile-portfolio-section">
          <div className="profile-portfolio-heading">
            <div><span className="eyebrow"><span className="eyebrow-dot" /> SELECTED WORK</span><h2>Portfolio</h2></div>
            <span>{portfolioLoading ? "Loading…" : `${artworks.length} ${artworks.length === 1 ? "piece" : "pieces"}`}</span>
          </div>
          {portfolioLoading ? (
            <div className="portfolio-loading" role="status">Loading portfolio…</div>
          ) : portfolioError ? (
            <ErrorMessage
              message={portfolioError}
              onRetry={() => loadPortfolio(artistUserId)}
            />
          ) : (
            <PortfolioGallery artworks={artworks} />
          )}
        </section>
      </div>
    </section>
  );
}

export default ArtistProfile;
