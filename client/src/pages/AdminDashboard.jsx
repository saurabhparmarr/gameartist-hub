import { useEffect, useState } from "react";
import {
  Activity,
  BriefcaseBusiness,
  Building2,
  UserRound,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import ErrorMessage from "../components/ErrorMessage.jsx";
import { fetchAdminDashboard } from "../services/adminService.js";
import { getAuthErrorMessage } from "../services/authService.js";

const statCards = [
  { key: "totalUsers", label: "Registered users", icon: Users, to: "/admin/users" },
  { key: "artists", label: "Artists", icon: UserRound, to: "/admin/artists" },
  { key: "studios", label: "Studios", icon: Building2, to: "/admin/studios" },
  { key: "totalProjects", label: "Projects", icon: BriefcaseBusiness, to: "/admin/projects" },
  { key: "activeUsers", label: "Active accounts", icon: Activity, to: "/admin/users" },
  { key: "disabledUsers", label: "Disabled accounts", icon: Activity, to: "/admin/users" },
];

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function AdminDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadDashboard(signal) {
    setLoading(true);
    setError("");
    try {
      const data = await fetchAdminDashboard(signal);
      if (!signal?.aborted) setDashboard(data);
    } catch (loadError) {
      if (!signal?.aborted) setError(getAuthErrorMessage(loadError));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    loadDashboard(controller.signal);
    return () => controller.abort();
  }, []);

  return (
    <div className="admin-page">
      <header className="admin-page-heading">
        <div><p className="eyebrow">ADMINISTRATION</p><h1>Overview</h1><p>Live activity and account totals from GameArtist Hub.</p></div>
      </header>
      {error && <ErrorMessage message={error} onRetry={() => loadDashboard()} />}
      {loading ? (
        <div className="admin-loading" role="status">Loading dashboard statistics…</div>
      ) : dashboard ? (
        <>
          <section className="admin-stat-grid" aria-label="Platform statistics">
            {statCards.map(({ key, label, icon: Icon, to }) => (
              <Link className="admin-stat-card" to={to} key={key}>
                <span className="admin-stat-icon"><Icon size={18} /></span>
                <span className="admin-stat-label">{label}</span>
                <strong>{dashboard.stats[key].toLocaleString()}</strong>
              </Link>
            ))}
          </section>
          <section className="admin-dashboard-lists">
            <div className="admin-panel">
              <div className="admin-panel-heading"><div><h2>Recent registrations</h2><p>Newest artist and studio accounts</p></div><Link to="/admin/users">View all</Link></div>
              {dashboard.recentUsers.length ? (
                <div className="admin-recent-list">
                  {dashboard.recentUsers.map((account) => (
                    <div className="admin-recent-row" key={account._id}>
                      <span className="admin-row-avatar"><UserRound size={16} /></span>
                      <span className="admin-row-main"><strong>{account.name}</strong><small>{account.email}</small></span>
                      <span className="admin-role-tag">{account.role}</span>
                      <time>{formatDate(account.createdAt)}</time>
                    </div>
                  ))}
                </div>
              ) : <p className="admin-empty">No registrations yet.</p>}
            </div>
            <div className="admin-panel">
              <div className="admin-panel-heading"><div><h2>Recent projects</h2><p>Latest studio listings</p></div><Link to="/admin/projects">View all</Link></div>
              {dashboard.recentProjects.length ? (
                <div className="admin-recent-list">
                  {dashboard.recentProjects.map((project) => (
                    <div className="admin-recent-row" key={project._id}>
                      <span className="admin-row-avatar"><BriefcaseBusiness size={16} /></span>
                      <span className="admin-row-main"><strong>{project.title}</strong><small>{project.studio?.name || "Studio unavailable"}</small></span>
                      <span className={`admin-status-tag admin-status-${project.status}`}>{project.status}</span>
                      <time>{formatDate(project.createdAt)}</time>
                    </div>
                  ))}
                </div>
              ) : <p className="admin-empty">No projects yet.</p>}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

export default AdminDashboard;
