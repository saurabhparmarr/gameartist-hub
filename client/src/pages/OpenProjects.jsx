import { useEffect, useState } from "react";
import { BriefcaseBusiness, Search } from "lucide-react";
import { Link } from "react-router-dom";
import EmptyState from "../components/EmptyState.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import LoadingSkeleton from "../components/LoadingSkeleton.jsx";
import ProjectCard from "../components/ProjectCard.jsx";
import { getOpenProjects, getRequestErrorMessage } from "../services/artistService.js";

function OpenProjects() {
  const [projects, setProjects] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [skill, setSkill] = useState("");
  const [searchText, setSearchText] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    getOpenProjects({ page, limit: 12, skill }, controller.signal)
      .then((result) => {
        setProjects(result.projects);
        setPagination(result.pagination);
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) setError(getRequestErrorMessage(requestError));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, refreshKey, skill]);

  function handleSearch(event) {
      event.preventDefault();
      setPage(1);
      setSkill(searchText.trim());
  }

  function clearSearch() {
      setSearchText("");
      setSkill("");
      setPage(1);
  }

  return (
    <section className="directory-page">
      <div className="directory-hero">
        <div className="container directory-hero-content">
          <div className="eyebrow"><span className="eyebrow-dot" /> OPEN GAME PROJECTS</div>
          <h1>Find your next<br /><span>creative quest.</span></h1>
          <p>Explore live opportunities from studios building their next worlds.</p>
          <div className="directory-count"><BriefcaseBusiness size={17} /><strong>{loading ? "…" : pagination.total} projects</strong><span>currently open</span></div>
        </div>
      </div>
      <div className="container directory-content">
        <div className="directory-results"><h2>Open projects</h2><Link className="text-link" to="/artists">Browse artists</Link></div>
        <form className="projects-search" onSubmit={handleSearch}>
          <Search size={17} />
          <label className="sr-only" htmlFor="project-skill-search">Search required skills</label>
          <input id="project-skill-search" value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Filter by required skill" />
          <button className="button button-primary" type="submit">Search</button>
          {skill && <button className="button button-outline" type="button" onClick={clearSearch}>Clear</button>}
        </form>
        {error ? <ErrorMessage message={error} onRetry={() => setRefreshKey((value) => value + 1)} /> : loading ? <LoadingSkeleton count={3} /> : projects.length ? (
          <>
            <div className="project-grid project-grid-public">{projects.map((project) => <ProjectCard key={project._id} project={project} />)}</div>
            {pagination.totalPages > 1 && (
              <nav className="artist-pagination" aria-label="Project pages">
                <button className="button button-outline" type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1}>Previous</button>
                <span>Page {pagination.page} of {pagination.totalPages}</span>
                <button className="button button-outline" type="button" onClick={() => setPage((value) => Math.min(pagination.totalPages, value + 1))} disabled={page >= pagination.totalPages}>Next</button>
              </nav>
            )}
          </>
        ) : (
          <EmptyState title={skill ? "No matching projects" : "No open projects yet"} message={skill ? "Try another skill or clear the search." : "Check back later for opportunities from indie studios."} actionLabel={skill ? "Clear search" : undefined} onAction={skill ? clearSearch : undefined} />
        )}
      </div>
    </section>
  );
}

export default OpenProjects;
