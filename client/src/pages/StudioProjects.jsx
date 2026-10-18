import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import LoadingSkeleton from "../components/LoadingSkeleton.jsx";
import ProjectCard from "../components/ProjectCard.jsx";
import { deleteProject, getAllMyProjects, getRequestErrorMessage } from "../services/artistService.js";

function StudioProjects() {
  const navigate = useNavigate();
  const location = useLocation();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState(location.state?.notice || "");
  const [refreshKey, setRefreshKey] = useState(0);

  const loadProjects = useCallback(async (signal) => {
    setLoading(true);
    setError("");
    try {
      const result = await getAllMyProjects(signal);
      if (!signal.aborted) {
        setProjects(result);
      }
    } catch (requestError) {
      if (!signal.aborted) setError(getRequestErrorMessage(requestError));
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadProjects(controller.signal);
    return () => controller.abort();
  }, [loadProjects, refreshKey]);

  async function handleDelete() {
    setDeleting(true);
    setError("");
    try {
      await deleteProject(deleteTarget._id);
      setDeleteTarget(null);
      setNotice("Project deleted.");
      setRefreshKey((value) => value + 1);
    } catch (deleteError) {
      setError(getRequestErrorMessage(deleteError));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="dashboard-page-content">
      <header className="dashboard-page-heading">
        <div><span className="eyebrow"><span className="eyebrow-dot" /> STUDIO PROJECTS</span><h1>Project management</h1><p>Create opportunities and keep project details up to date.</p></div>
        <Link className="button button-primary" to="/studio/projects/new"><Plus size={16} /> Create project</Link>
      </header>
      {notice && <p className="dashboard-success" role="status">{notice}</p>}
      {error && <ErrorMessage message={error} onRetry={() => setRefreshKey((value) => value + 1)} />}
      {loading ? <LoadingSkeleton count={4} /> : projects.length ? (
        <div className="project-grid">{projects.map((project) => (
          <div key={project._id}>
            <ProjectCard project={project} owned />
            <button className="danger-text project-delete-link" type="button" onClick={() => setDeleteTarget(project)}>Delete project</button>
          </div>
        ))}</div>
      ) : !error ? (
        <EmptyState title="No projects yet" message="Create a project to invite artists to collaborate with your studio." actionLabel="Create your first project" onAction={() => navigate("/studio/projects/new")} />
      ) : null}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete this project?"
          message={`“${deleteTarget.title}” will be permanently deleted.`}
          isLoading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      <Link className="text-link dashboard-back-link" to="/studio/dashboard"><ArrowRight size={15} /> Back to overview</Link>
    </div>
  );
}

export default StudioProjects;
