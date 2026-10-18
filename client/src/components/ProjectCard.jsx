import { ArrowUpRight, BriefcaseBusiness, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

function ProjectCard({ project, owned = false }) {
  const studioId = project.studio?._id || project.studio;
  const studioName = project.studio?.name || "Independent studio";

  return (
    <article className="project-card">
      <div className="project-card-top">
        <span className={`project-status status-${project.status}`}>{project.status}</span>
        {typeof project.budget === "number" && <span className="project-budget">${project.budget.toLocaleString()}</span>}
      </div>
      <h3><Link to={`/projects/${project._id}`}>{project.title}</Link></h3>
      <span className="project-studio"><BriefcaseBusiness size={14} /> {studioName}</span>
      <p>{project.description}</p>
      {project.skillsRequired?.length > 0 && (
        <div className="skill-list">{project.skillsRequired.map((skill) => <span key={skill}>{skill}</span>)}</div>
      )}
      <div className="project-card-footer">
        <span>{project.status === "open" ? "Accepting collaborators" : "No longer accepting proposals"}</span>
        <Link className="text-link" to={`/projects/${project._id}`}>
          {owned ? "Manage" : "View project"} <ArrowUpRight size={15} />
        </Link>
      </div>
      {studioId && !owned && (
        <Link
          className="project-contact-link"
          to={`/messages?userId=${encodeURIComponent(studioId)}&name=${encodeURIComponent(studioName)}`}
        >
          <MapPin size={13} /> Contact studio
        </Link>
      )}
    </article>
  );
}

export default ProjectCard;
