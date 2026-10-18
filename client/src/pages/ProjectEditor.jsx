import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ErrorMessage from "../components/ErrorMessage.jsx";
import LoadingSkeleton from "../components/LoadingSkeleton.jsx";
import ProjectForm from "../components/ProjectForm.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import {
  createProject,
  getProjectById,
  getRequestErrorMessage,
  updateProject,
} from "../services/artistService.js";

function ProjectEditor({ edit = false }) {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(edit);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!edit) return undefined;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setProject(null);
    getProjectById(id, controller.signal)
      .then((result) => {
        if (String(result.studio?._id || result.studio) !== String(user.id)) {
          setError("You can only edit projects owned by your studio.");
          return;
        }
        setProject(result);
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) setError(getRequestErrorMessage(requestError));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [edit, id, user.id]);

  async function saveProject(fields) {
    const savedProject = edit
      ? await updateProject(id, fields)
      : await createProject(fields);
    navigate(`/studio/projects/${savedProject._id}`, {
      replace: true,
      state: { notice: edit ? "Project updated successfully." : "Project created successfully." },
    });
  }

  return (
    <div className="dashboard-page-content dashboard-editor-page">
      <header className="dashboard-page-heading">
        <div><span className="eyebrow"><span className="eyebrow-dot" /> STUDIO PROJECTS</span><h1>{edit ? "Edit project" : "Create a project"}</h1><p>Share the opportunity with the artists who can bring it to life.</p></div>
      </header>
      {loading ? <LoadingSkeleton count={2} /> : error ? <ErrorMessage message={error} /> : (
        <ProjectForm initialProject={project} onSubmit={saveProject} submitLabel={edit ? "Save changes" : "Publish project"} />
      )}
    </div>
  );
}

export default ProjectEditor;
