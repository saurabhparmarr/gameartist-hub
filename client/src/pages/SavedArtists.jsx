import { useCallback, useEffect, useState } from "react";
import { ArrowRight, BookmarkX } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import ArtistCard from "../components/ArtistCard.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import LoadingSkeleton from "../components/LoadingSkeleton.jsx";
import { getAllArtists, getRequestErrorMessage, getSavedArtists, removeSavedArtist } from "../services/artistService.js";

function SavedArtists() {
  const navigate = useNavigate();
  const [savedArtists, setSavedArtists] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadSavedArtists = useCallback(async (signal) => {
    setLoading(true);
    setError("");
    try {
      const saved = await getSavedArtists();
      if (signal.aborted) return;
      setSavedArtists(saved);
      const artists = await getAllArtists(signal);
      if (signal.aborted) return;
      const savedIds = new Set(saved.map((entry) => String(entry.artist?._id || entry.artist)));
      setProfiles(artists.filter((artist) => savedIds.has(String(artist.user?._id))));
    } catch (requestError) {
      if (!signal.aborted) setError(getRequestErrorMessage(requestError));
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadSavedArtists(controller.signal);
    return () => controller.abort();
  }, [loadSavedArtists, refreshKey]);

  async function confirmRemove() {
    setRemoving(true);
    setError("");
    try {
      const artistId = removeTarget.artist?._id || removeTarget.artist;
      await removeSavedArtist(artistId);
      setRemoveTarget(null);
      setRefreshKey((value) => value + 1);
    } catch (removeError) {
      setError(getRequestErrorMessage(removeError));
      setRemoveTarget(null);
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="dashboard-page-content">
      <header className="dashboard-page-heading">
        <div><span className="eyebrow"><span className="eyebrow-dot" /> YOUR STUDIO</span><h1>Saved artists</h1><p>Keep promising creative collaborators close.</p></div>
        <Link className="button button-outline" to="/artists">Discover artists <ArrowRight size={15} /></Link>
      </header>
      <p className="dashboard-info-note">Saved artists below include public profiles. Accounts without a published artist profile are not returned by the artist directory.</p>
      {error && <ErrorMessage message={error} onRetry={() => setRefreshKey((value) => value + 1)} />}
      {loading ? <LoadingSkeleton count={3} /> : profiles.length ? (
        <div className="saved-artists-list">
          {profiles.map((profile) => {
            const saved = savedArtists.find((entry) => String(entry.artist?._id || entry.artist) === String(profile.user?._id));
            return (
              <div className="saved-artist-item" key={profile._id}>
                <ArtistCard artist={profile} />
                <button className="button button-outline saved-remove-button" type="button" onClick={() => setRemoveTarget(saved)}>
                  <BookmarkX size={15} /> Remove saved artist
                </button>
              </div>
            );
          })}
        </div>
      ) : !error ? <EmptyState title="No saved artists yet" message={savedArtists.length ? "Your saved artist accounts don't have published profiles yet." : "Browse public artist profiles and save people you'd like to work with."} actionLabel="Browse artists" onAction={() => navigate("/artists")} /> : null}
      {removeTarget && (
        <ConfirmDialog
          title="Remove this artist?"
          message={`Remove ${removeTarget.artist?.name || "this artist"} from your studio's saved list?`}
          confirmLabel="Remove artist"
          isLoading={removing}
          onConfirm={confirmRemove}
          onCancel={() => setRemoveTarget(null)}
        />
      )}
    </div>
  );
}

export default SavedArtists;
