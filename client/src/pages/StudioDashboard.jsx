import { useCallback, useEffect, useState } from "react";
import { ArrowRight, BriefcaseBusiness, Compass, Plus, Users } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import ArtistCard from "../components/ArtistCard.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import LoadingSkeleton from "../components/LoadingSkeleton.jsx";
import ProjectCard from "../components/ProjectCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import {
  getArtists,
  getAllMyProjects,
  getRequestErrorMessage,
  getSavedArtists,
} from "../services/artistService.js";

function StudioDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [savedArtists, setSavedArtists] = useState([]);
  const [featuredArtists, setFeaturedArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const loadDashboard = useCallback(async (signal) => {
    setLoading(true);
    setError("");
    const results = await Promise.allSettled([
      getAllMyProjects(signal),
      getSavedArtists(),
      getArtists({ page: 1, limit: 3 }, signal),
    ]);
    if (signal.aborted) return;

    const failures = [];
    if (results[0].status === "fulfilled") {
      setProjects(results[0].value);
    } else {
      setProjects([]);
      failures.push(getRequestErrorMessage(results[0].reason));
    }
    if (results[1].status === "fulfilled") setSavedArtists(results[1].value);
    else {
      setSavedArtists([]);
      failures.push(getRequestErrorMessage(results[1].reason));
    }
    if (results[2].status === "fulfilled") setFeaturedArtists(results[2].value.artists);
    else setFeaturedArtists([]);
    setError(failures.join(" "));
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    const controller = new AbortController();
    loadDashboard(controller.signal);
    return () => controller.abort();
  }, [loadDashboard, refreshKey]);

  return (
    <div className="dashboard-page-content">
      <header className="dashboard-page-heading">
        <div><span className="eyebrow"><span className="eyebrow-dot" /> STUDIO SPACE</span><h1>Welcome, {user.name.split(" ")[0]}.</h1><p>Find great artists and build your next game world.</p></div>
        <Link className="button button-primary" to="/studio/projects/new"><Plus size={16} /> Post a project</Link>
      </header>

      {error && <ErrorMessage message={error} onRetry={() => setRefreshKey((value) => value + 1)} />}

      <section className="dashboard-stat-grid">
        <article className="dashboard-stat-card"><span><BriefcaseBusiness size={18} /></span><div><small>YOUR PROJECTS</small><strong>{loading ? "…" : projects.length}</strong></div></article>
        <article className="dashboard-stat-card"><span><Users size={18} /></span><div><small>SAVED ARTISTS</small><strong>{loading ? "…" : savedArtists.length}</strong></div></article>
        <article className="dashboard-stat-card"><span><Compass size={18} /></span><div><small>FEATURED ARTISTS</small><strong>{loading ? "…" : featuredArtists.length}</strong></div></article>
      </section>

      <section className="dashboard-panel">
        <div className="dashboard-panel-heading"><div><h2>Your projects</h2><p>Manage projects and keep track of their status.</p></div><Link className="text-link" to="/studio/projects">All projects <ArrowRight size={15} /></Link></div>
        {loading ? <LoadingSkeleton count={2} /> : projects.length ? (
          <div className="project-grid">{projects.slice(0, 3).map((project) => <ProjectCard key={project._id} project={project} owned />)}</div>
        ) : <EmptyState title="No projects yet" message="Post your first project to find artists for your studio." actionLabel="Create a project" onAction={() => navigate("/studio/projects/new")} />}
      </section>

      <section className="dashboard-panel">
        <div className="dashboard-panel-heading"><div><h2>Saved artists</h2><p>Your studio's saved talent, ready to revisit.</p></div><Link className="text-link" to="/studio/saved-artists">View saved artists <ArrowRight size={15} /></Link></div>
        {loading ? <LoadingSkeleton count={2} /> : savedArtists.length ? (
          <div className="artist-grid">
            {savedArtists.slice(0, 3).map((entry) => {
              const artist = entry.artist;
              return artist?._id ? (
                <div className="saved-artist-dashboard-card" key={entry._id}>
                  <div><strong>{artist.name}</strong><span>Saved for your studio</span></div>
                  <Link className="text-link" to={`/messages?userId=${encodeURIComponent(artist._id)}&name=${encodeURIComponent(artist.name)}`}>Message <ArrowRight size={14} /></Link>
                </div>
              ) : null;
            })}
          </div>
        ) : <EmptyState title="No saved artists yet" message="Browse artist portfolios and save people you'd like to work with." actionLabel="Discover artists" onAction={() => navigate("/artists")} />}
      </section>

      <section className="dashboard-panel">
        <div className="dashboard-panel-heading"><div><h2>Discover artists</h2><p>Explore the talent building game worlds.</p></div><Link className="text-link" to="/artists">Browse artists <ArrowRight size={15} /></Link></div>
        {loading ? <LoadingSkeleton count={3} /> : featuredArtists.length ? <div className="artist-grid">{featuredArtists.map((artist) => <ArtistCard key={artist._id} artist={artist} />)}</div> : <EmptyState title="No artist profiles yet" message="Artists will appear here when they publish their profile." />}
      </section>
    </div>
  );
}

export default StudioDashboard;
