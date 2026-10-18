import { useState } from "react";
import { Save } from "lucide-react";

const categories = ["Concept Art", "3D Environment", "Character Art", "Animation", "Other"];

function PortfolioForm({ initialItem, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    title: initialItem?.title || "",
    description: initialItem?.description || "",
    category: initialItem?.category || categories[0],
    imageUrl: initialItem?.imageUrl || "",
    tools: (initialItem?.tools || []).join(", "),
  });
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    const title = form.title.trim();
    if (!title) {
      setError("Artwork title is required.");
      return;
    }
    const item = {
      title,
      description: form.description.trim(),
      category: form.category,
      imageUrl: form.imageUrl.trim(),
      tools: form.tools.split(",").map((tool) => tool.trim()).filter(Boolean),
    };

    setIsSaving(true);
    try {
      await onSubmit(item);
    } catch (submitError) {
      setError(submitError.message || "Artwork could not be saved. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="dashboard-form portfolio-form" onSubmit={handleSubmit}>
      <h3>{initialItem ? "Edit artwork" : "Add artwork"}</h3>
      {error && <p className="dashboard-form-error" role="alert">{error}</p>}
      <label className="dashboard-field"><span>Title <b>*</b></span><input name="title" maxLength="120" value={form.title} onChange={updateField} required /></label>
      <label className="dashboard-field"><span>Category <b>*</b></span>
        <select name="category" value={form.category} onChange={updateField}>
          {categories.map((category) => <option key={category} value={category}>{category}</option>)}
        </select>
      </label>
      <label className="dashboard-field"><span>Image URL <small>(backend accepts a URL, not file uploads)</small></span><input name="imageUrl" type="url" value={form.imageUrl} onChange={updateField} placeholder="https://example.com/artwork.jpg" /></label>
      <label className="dashboard-field"><span>Description</span><textarea name="description" rows="3" maxLength="2000" value={form.description} onChange={updateField} /></label>
      <label className="dashboard-field"><span>Tools <small>(comma-separated)</small></span><input name="tools" value={form.tools} onChange={updateField} placeholder="Blender, Unreal Engine" /></label>
      <div className="dashboard-form-actions">
        <button className="button button-primary" type="submit" disabled={isSaving}><Save size={15} /> {isSaving ? "Saving…" : "Save artwork"}</button>
        <button className="button button-outline" type="button" onClick={onCancel} disabled={isSaving}>Cancel</button>
      </div>
    </form>
  );
}

export default PortfolioForm;
