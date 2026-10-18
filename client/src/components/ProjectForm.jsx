import { useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { Link } from "react-router-dom";

const emptyProject = {
  title: "",
  description: "",
  skillsRequired: "",
  budget: "",
  status: "open",
};

function ProjectForm({ initialProject, onSubmit, submitLabel }) {
  const [form, setForm] = useState(initialProject ? {
    title: initialProject.title || "",
    description: initialProject.description || "",
    skillsRequired: (initialProject.skillsRequired || []).join(", "),
    budget: initialProject.budget ?? "",
    status: initialProject.status || "open",
  } : emptyProject);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    const title = form.title.trim();
    const description = form.description.trim();
    const skillsRequired = form.skillsRequired.split(",").map((skill) => skill.trim()).filter(Boolean);

    if (!title || !description) {
      setError("Project title and description are required.");
      return;
    }

    const project = { title, description, skillsRequired, status: form.status };
    if (form.budget !== "") {
      const budget = Number(form.budget);
      if (!Number.isFinite(budget) || budget < 0) {
        setError("Budget must be a non-negative number.");
        return;
      }
      project.budget = budget;
    }

    setIsSaving(true);
    try {
      await onSubmit(project);
    } catch (submitError) {
      setError(submitError.message || "Project could not be saved. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="dashboard-form project-form" onSubmit={handleSubmit}>
      <Link className="text-link" to="/studio/projects"><ArrowLeft size={15} /> All projects</Link>
      {error && <p className="dashboard-form-error" role="alert">{error}</p>}
      <label className="dashboard-field">
        <span>Project title <b>*</b></span>
        <input name="title" maxLength="120" value={form.title} onChange={updateField} placeholder="e.g. Stylized forest environment" required />
      </label>
      <label className="dashboard-field">
        <span>Project description <b>*</b></span>
        <textarea name="description" rows="6" maxLength="5000" value={form.description} onChange={updateField} placeholder="Describe the game, art direction, and collaboration you're looking for." required />
      </label>
      <label className="dashboard-field">
        <span>Skills required <small>(comma-separated)</small></span>
        <input name="skillsRequired" value={form.skillsRequired} onChange={updateField} placeholder="Environment art, Blender, Unreal Engine" />
      </label>
      <div className="dashboard-form-row">
        <label className="dashboard-field">
          <span>Budget <small>(optional)</small></span>
          <input name="budget" type="number" min="0" step="any" value={form.budget} onChange={updateField} placeholder="1500" />
        </label>
        <label className="dashboard-field">
          <span>Project status</span>
          <select name="status" value={form.status} onChange={updateField}>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </label>
      </div>
      <button className="button button-primary" type="submit" disabled={isSaving}>
        <Save size={16} /> {isSaving ? "Saving project…" : submitLabel}
      </button>
    </form>
  );
}

export default ProjectForm;
