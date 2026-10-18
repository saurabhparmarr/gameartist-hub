import { useEffect, useState } from "react";
import { ArrowLeft, BriefcaseBusiness, Pencil, Trash2 } from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { deleteProject, getProjectById, getRequestErrorMessage } from "../services/artistService.js";

function ProjectDetails() {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState(location.state?.notice || "");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setProject(null);
    getProjectById(id, controller.signal)
      .then(setProject)
      .catch((requestError) => {
        if (!controller.signal.aborted) setError(getRequestErrorMessage(requestError));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id]);

  const isOwner = project && isAuthenticated && user.role === "studio"
    && String(project.studio?._id || project.studio) === String(user.id);

  async function handleDelete() {
    setDeleting(true);
    setError("");
    try {
      await deleteProject(id);
      navigate("/studio/projects", { replace: true, state: { notice: "Project deleted successfully." } });
    } catch (deleteError) {
      setError(getRequestErrorMessage(deleteError));
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <div className="container project-public-page"><div className="portfolio-loading">Loading project…</div></div>;
  if (error || !project) return <div className="container project-public-page"><ErrorMessage message={error || "Project not found."} /></div>;

  return (
    <section className="container project-public-page">
      <Link className="text-link" to={isOwner ? "/studio/projects" : "/projects"}><ArrowLeft size={15} /> Back</Link>
      {notice && <p className="dashboard-success" role="status">{notice}</p>}
      <article className="project-detail-card">
        <div className="project-card-top"><span className={`project-status status-${project.status}`}>{project.status}</span>{typeof project.budget === "number" && <span className="project-budget">${project.budget.toLocaleString()}</span>}</div>
        <span className="project-studio"><BriefcaseBusiness size={15} /> {project.studio?.name || "Independent studio"}</span>
        <h1>{project.title}</h1>
        <p className="project-detail-description">{project.description}</p>
        <h2>Skills required</h2>
        {project.skillsRequired?.length ? <div className="skill-list">{project.skillsRequired.map((skill) => <span key={skill}>{skill}</span>)}</div> : <p className="project-detail-muted">No specific skills listed.</p>}
        <p className="project-detail-date">Posted {new Date(project.createdAt).toLocaleDateString()}</p>
        {isOwner ? (
          <div className="project-detail-actions">
            <Link className="button button-outline" to={`/studio/projects/${id}/edit`}><Pencil size={15} /> Edit project</Link>
            <button className="button button-danger" type="button" onClick={() => setConfirmDelete(true)}><Trash2 size={15} /> Delete project</button>
          </div>
        ) : project.status === "open" && project.studio?._id ? (
          <Link className="button button-primary" to={`/messages?userId=${encodeURIComponent(project.studio._id)}&name=${encodeURIComponent(project.studio.name || "Studio")}`}>
            Contact studio
          </Link>
        ) : null}
      </article>
      {confirmDelete && (
        <ConfirmDialog
          title="Delete this project?"
          message={`“${project.title}” will be permanently deleted.`}
          isLoading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </section>
  );
}

export default ProjectDetails;
