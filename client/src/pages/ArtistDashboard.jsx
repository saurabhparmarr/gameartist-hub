import { useCallback, useEffect, useState } from "react";
import { ArrowRight, BriefcaseBusiness, ImagePlus, Plus, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import ArtistCard from "../components/ArtistCard.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import LoadingSkeleton from "../components/LoadingSkeleton.jsx";
import PortfolioForm from "../components/PortfolioForm.jsx";
import ProjectCard from "../components/ProjectCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import {
  createPortfolioItem,
  deletePortfolioItem,
  getArtistPortfolio,
  getAllOpenProjects,
  getOwnArtistProfile,
  getRequestErrorMessage,
  saveOwnArtistProfile,
  updateOwnArtistProfile,
  updatePortfolioItem,
} from "../services/artistService.js";

const emptyProfile = { bio: "", skills: "", experience: "", location: "", profileImage: "", software: "" };

function ArtistDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [portfolio, setPortfolio] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [profileForm, setProfileForm] = useState(emptyProfile);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [editingArtwork, setEditingArtwork] = useState(null);
  const [showArtworkForm, setShowArtworkForm] = useState(false);
  const [deleteArtwork, setDeleteArtwork] = useState(null);
  const [deletingArtwork, setDeletingArtwork] = useState(false);
  const [artworkError, setArtworkError] = useState("");

  const loadDashboard = useCallback(async (signal) => {
    setLoading(true);
    setError("");

    try {
      const results = await Promise.allSettled([
        getOwnArtistProfile(user.name, user.id, signal),
        getAllOpenProjects(signal),
      ]);
      if (signal.aborted) return;
      const profileResult = results[0];
      const projectsResult = results[1];
      if (profileResult.status === "rejected") throw profileResult.reason;
      const ownProfile = profileResult.value;
      setProfile(ownProfile);
      setProfileForm(ownProfile ? {
        bio: ownProfile.bio || "",
        skills: (ownProfile.skills || []).join(", "),
        experience: ownProfile.experience ?? "",
        location: ownProfile.location || "",
        profileImage: ownProfile.profileImage || "",
        software: (ownProfile.software || []).join(", "),
      } : emptyProfile);

      const portfolioItems = ownProfile
        ? await getArtistPortfolio(user.id, signal)
        : [];
      if (signal.aborted) return;
      setPortfolio(portfolioItems);
      if (projectsResult.status === "fulfilled") {
        setProjects(projectsResult.value);
      } else {
        setProjects([]);
      }
      setError(projectsResult.status === "rejected" ? getRequestErrorMessage(projectsResult.reason) : "");
    } catch (requestError) {
      if (!signal.aborted) setError(getRequestErrorMessage(requestError));
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [user.id, user.name]);

  useEffect(() => {
    const controller = new AbortController();
    loadDashboard(controller.signal);
    return () => controller.abort();
  }, [loadDashboard, refreshKey]);

  function updateProfileField(event) {
    setProfileForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSaveProfile(event) {
    event.preventDefault();
    setProfileError("");
    setProfileSuccess("");
    const experience = profileForm.experience === "" ? undefined : Number(profileForm.experience);
    if (experience !== undefined && (!Number.isFinite(experience) || experience < 0)) {
      setProfileError("Experience must be a non-negative number.");
      return;
    }

    const fields = {
      bio: profileForm.bio.trim(),
      skills: profileForm.skills.split(",").map((skill) => skill.trim()).filter(Boolean),
      location: profileForm.location.trim(),
      profileImage: profileForm.profileImage.trim(),
      software: profileForm.software.split(",").map((tool) => tool.trim()).filter(Boolean),
    };
    if (experience !== undefined) fields.experience = experience;
    setSavingProfile(true);
    try {
      const savedProfile = profile
        ? await updateOwnArtistProfile(fields)
        : await saveOwnArtistProfile(fields);
      setProfile(savedProfile);
      setProfileSuccess("Your artist profile was saved.");
      setRefreshKey((value) => value + 1);
    } catch (saveError) {
      setProfileError(getRequestErrorMessage(saveError));
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSaveArtwork(item) {
    setArtworkError("");
    try {
      if (editingArtwork) await updatePortfolioItem(editingArtwork._id, item);
      else await createPortfolioItem(item);
      setEditingArtwork(null);
      setShowArtworkForm(false);
      setRefreshKey((value) => value + 1);
    } catch (saveError) {
      throw new Error(getRequestErrorMessage(saveError));
    }
  }

  async function confirmDeleteArtwork() {
    setDeletingArtwork(true);
    setArtworkError("");
    try {
      await deletePortfolioItem(deleteArtwork._id);
      setDeleteArtwork(null);
      setRefreshKey((value) => value + 1);
    } catch (deleteError) {
      setArtworkError(getRequestErrorMessage(deleteError));
      setDeleteArtwork(null);
    } finally {
      setDeletingArtwork(false);
    }
  }

  const completionFields = profile
    ? [profile.bio, profile.skills?.length, profile.location, profile.profileImage, profile.software?.length, typeof profile.experience === "number"].filter(Boolean).length
    : 0;
  const completion = Math.round((completionFields / 6) * 100);

  return (
    <div className="dashboard-page-content">
      <header className="dashboard-page-heading">
        <div><span className="eyebrow"><span className="eyebrow-dot" /> ARTIST SPACE</span><h1>Welcome, {user.name.split(" ")[0]}.</h1><p>Your craft, your portfolio, your next collaboration.</p></div>
        <Link className="button button-outline" to={`/artists${profile ? `/${profile._id}` : ""}`}>{profile ? "View public profile" : "Discover artists"} <ArrowRight size={15} /></Link>
      </header>

      {error && <ErrorMessage message={error} onRetry={() => setRefreshKey((value) => value + 1)} />}

      <section className="dashboard-stat-grid">
        <article className="dashboard-stat-card"><span><UserRound size={18} /></span><div><small>PROFILE COMPLETE</small><strong>{loading ? "…" : `${completion}%`}</strong><div className="completion-track"><span style={{ width: `${completion}%` }} /></div></div></article>
        <article className="dashboard-stat-card"><span><ImagePlus size={18} /></span><div><small>PORTFOLIO PIECES</small><strong>{loading ? "…" : portfolio.length}</strong></div></article>
        <article className="dashboard-stat-card"><span><BriefcaseBusiness size={18} /></span><div><small>OPEN OPPORTUNITIES</small><strong>{loading ? "…" : projects.length}</strong></div></article>
      </section>

      <section className="dashboard-panel" id="artist-profile">
        <div className="dashboard-panel-heading"><div><h2>Artist profile</h2><p>Only the fields supported by your artist profile are editable here.</p></div></div>
        {profileSuccess && <p className="dashboard-success" role="status">{profileSuccess}</p>}
        {profileError && <ErrorMessage message={profileError} compact />}
        {loading ? <LoadingSkeleton count={2} /> : (
          <form className="dashboard-form profile-edit-form" onSubmit={handleSaveProfile}>
            <label className="dashboard-field"><span>Bio</span><textarea name="bio" rows="4" maxLength="1000" value={profileForm.bio} onChange={updateProfileField} placeholder="Tell studios about your creative work." /></label>
            <div className="dashboard-form-row">
              <label className="dashboard-field"><span>Skills <small>(comma-separated)</small></span><input name="skills" value={profileForm.skills} onChange={updateProfileField} placeholder="Concept art, Blender" /></label>
              <label className="dashboard-field"><span>Software &amp; tools <small>(comma-separated)</small></span><input name="software" value={profileForm.software} onChange={updateProfileField} placeholder="Photoshop, Unity" /></label>
            </div>
            <div className="dashboard-form-row">
              <label className="dashboard-field"><span>Location</span><input name="location" value={profileForm.location} onChange={updateProfileField} placeholder="City, country" /></label>
              <label className="dashboard-field"><span>Years of experience</span><input name="experience" type="number" min="0" step="any" value={profileForm.experience} onChange={updateProfileField} /></label>
            </div>
            <label className="dashboard-field"><span>Profile image URL <small>(backend accepts a URL, not file uploads)</small></span><input name="profileImage" type="url" value={profileForm.profileImage} onChange={updateProfileField} placeholder="https://example.com/your-photo.jpg" /></label>
            <button className="button button-primary" type="submit" disabled={savingProfile}>{savingProfile ? "Saving profile…" : profile ? "Save profile" : "Create artist profile"}</button>
          </form>
        )}
      </section>

      <section className="dashboard-panel" id="artist-portfolio">
        <div className="dashboard-panel-heading">
          <div><h2>Your portfolio</h2><p>Manage artwork displayed on your public artist profile.</p></div>
          {!showArtworkForm && <button className="button button-primary" type="button" onClick={() => { setEditingArtwork(null); setShowArtworkForm(true); }} disabled={loading || !profile}><Plus size={16} /> Add artwork</button>}
        </div>
        {artworkError && <ErrorMessage message={artworkError} compact />}
        {(showArtworkForm || editingArtwork) && (
          <PortfolioForm
            initialItem={editingArtwork}
            onSubmit={handleSaveArtwork}
            onCancel={() => { setEditingArtwork(null); setShowArtworkForm(false); }}
          />
        )}
        {loading ? <LoadingSkeleton count={3} /> : portfolio.length ? (
          <div className="portfolio-grid dashboard-portfolio-grid">
            {portfolio.map((item) => (
              <article className="dashboard-artwork-card" key={item._id}>
                <img src={item.imageUrl || "/images/artwork-placeholder.svg"} alt={item.title} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/images/artwork-placeholder.svg"; }} />
                <div><span>{item.category}</span><h3>{item.title}</h3><p>{item.description || "No description added."}</p></div>
                <div className="dashboard-artwork-actions">
                  <button type="button" onClick={() => { setEditingArtwork(item); setShowArtworkForm(false); }}>Edit</button>
                  <button type="button" className="danger-text" onClick={() => setDeleteArtwork(item)}>Delete</button>
                </div>
              </article>
            ))}
          </div>
        ) : !loading && !profile ? (
          <EmptyState title="Create your profile first" message="Your portfolio will be available after you create an artist profile." />
        ) : !loading ? (
          <EmptyState title="Your portfolio is ready for its first piece" message="Add artwork so studios can explore your work." actionLabel="Add your first artwork" onAction={() => setShowArtworkForm(true)} />
        ) : null}
      </section>

      <section className="dashboard-panel">
        <div className="dashboard-panel-heading"><div><h2>Project opportunities</h2><p>Open projects from studios on GameArtist Hub.</p></div><Link className="text-link" to="/projects">Explore projects <ArrowRight size={15} /></Link></div>
        {loading ? <LoadingSkeleton count={2} /> : projects.length ? (
          <div className="project-grid">{projects.slice(0, 3).map((project) => <ProjectCard key={project._id} project={project} />)}</div>
        ) : <EmptyState title="No open projects right now" message="Check back later for new studio opportunities." />}
      </section>

      {deleteArtwork && (
        <ConfirmDialog
          title="Delete this artwork?"
          message={`“${deleteArtwork.title}” will be permanently removed from your portfolio.`}
          isLoading={deletingArtwork}
          onConfirm={confirmDeleteArtwork}
          onCancel={() => setDeleteArtwork(null)}
        />
      )}
    </div>
  );
}

export default ArtistDashboard;
