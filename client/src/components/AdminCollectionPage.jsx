import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Link } from "react-router-dom";
import ConfirmDialog from "./ConfirmDialog.jsx";
import EmptyState from "./EmptyState.jsx";
import ErrorMessage from "./ErrorMessage.jsx";
import {
  deleteAdminProject,
  fetchAdminCollection,
  updateAdminUserStatus,
} from "../services/adminService.js";
import { getAuthErrorMessage } from "../services/authService.js";

const PAGE_SIZE = 10;

const definitions = {
  users: { title: "User management", eyebrow: "ACCOUNTS", description: "Search and manage registered artist and studio accounts.", key: "users" },
  artists: { title: "Artist management", eyebrow: "CREATORS", description: "Review artist profiles, skills, experience, and portfolio work.", key: "artists" },
  studios: { title: "Studio management", eyebrow: "ORGANIZATIONS", description: "Review studio profiles and their associated projects.", key: "studios" },
  projects: { title: "Project management", eyebrow: "LISTINGS", description: "Review projects published by studios across the platform.", key: "projects" },
};

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function safeWebsiteUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function AccountStatus({ user, onToggle }) {
  const isActive = user.isActive !== false;
  return (
    <span className="admin-status-control">
      <span className={`admin-status-tag ${isActive ? "admin-status-active" : "admin-status-disabled"}`}>
        {isActive ? "Active" : "Disabled"}
      </span>
      <button className="admin-text-action" type="button" onClick={() => onToggle(user)}>
        {isActive ? "Disable" : "Reactivate"}
      </button>
    </span>
  );
}

function AdminCollectionPage({ resource }) {
  const definition = definitions[resource];
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [pendingAction, setPendingAction] = useState(null);
  const [isMutating, setIsMutating] = useState(false);
  const [reload, setReload] = useState(0);

  async function loadItems(signal) {
    setLoading(true);
    setError("");
    try {
      const params = { page, limit: PAGE_SIZE, search };
      if (resource === "users") params.role = role;
      if (resource === "users" || resource === "artists" || resource === "studios") {
        params.status = status;
      }
      if (resource === "projects") params.status = status;
      const result = await fetchAdminCollection(resource, params, signal);
      if (!signal?.aborted) {
        setItems(result[definition.key]);
        setPagination(result.pagination);
      }
    } catch (loadError) {
      if (!signal?.aborted) setError(getAuthErrorMessage(loadError));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    loadItems(controller.signal);
    return () => controller.abort();
  }, [resource, page, search, role, status, reload]);

  function submitSearch(event) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function confirmFor(item) {
    if (resource === "projects") {
      setPendingAction({ type: "delete", item });
    } else {
      setPendingAction({ type: "status", item, isActive: item.user?.isActive !== false && item.isActive !== false });
    }
    setActionError("");
  }

  async function executeAction() {
    setIsMutating(true);
    setActionError("");
    try {
      if (pendingAction.type === "delete") {
        await deleteAdminProject(pendingAction.item._id);
      } else {
        const account = pendingAction.item.user || pendingAction.item;
        await updateAdminUserStatus(account._id || account.id, !pendingAction.isActive);
      }
      setPendingAction(null);
      setReload((value) => value + 1);
    } catch (actionFailure) {
      setActionError(getAuthErrorMessage(actionFailure));
    } finally {
      setIsMutating(false);
    }
  }

  const totalPages = pagination.totalPages || 0;

  return (
    <div className="admin-page">
      <header className="admin-page-heading">
        <div><p className="eyebrow">{definition.eyebrow}</p><h1>{definition.title}</h1><p>{definition.description}</p></div>
        <span className="admin-result-count">{pagination.total.toLocaleString()} records</span>
      </header>
      <section className="admin-panel admin-management-panel">
        <div className="admin-toolbar">
          <form className="admin-search" onSubmit={submitSearch}>
            <Search size={17} />
            <input
              type="search"
              aria-label={`Search ${resource}`}
              placeholder={resource === "projects" ? "Search projects or studios" : "Search by name, email, or profile"}
              value={searchInput}
              maxLength={100}
              onChange={(event) => setSearchInput(event.target.value)}
            />
            <button className="button button-outline button-small" type="submit">Search</button>
          </form>
          {resource === "users" && (
            <label className="admin-select-label">Role
              <select value={role} onChange={(event) => { setRole(event.target.value); setPage(1); }}>
                <option value="all">All roles</option><option value="artist">Artist</option><option value="studio">Studio</option>
              </select>
            </label>
          )}
          {resource !== "projects" && (
            <label className="admin-select-label">Account
              <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
                <option value="all">All accounts</option><option value="active">Active</option><option value="disabled">Disabled</option>
              </select>
            </label>
          )}
          {resource === "projects" && (
            <label className="admin-select-label">Status
              <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
                <option value="all">All projects</option><option value="open">Open</option><option value="closed">Closed</option>
              </select>
            </label>
          )}
        </div>
        {error && <ErrorMessage message={error} onRetry={() => loadItems()} />}
        {loading ? (
          <div className="admin-loading" role="status">Loading {resource}…</div>
        ) : items.length === 0 ? (
          <EmptyState title="No records found" message={search ? "Try changing your search or filters." : "There are no records to display yet."} />
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr>
                {resource === "users" && <><th>User</th><th>Role</th><th>Registered</th><th>Account status</th></>}
                {resource === "artists" && <><th>Artist</th><th>Skills / experience</th><th>Portfolio</th><th>Registered</th><th>Account</th></>}
                {resource === "studios" && <><th>Studio</th><th>Profile</th><th>Projects</th><th>Registered</th><th>Account</th></>}
                {resource === "projects" && <><th>Project</th><th>Studio</th><th>Status</th><th>Created</th><th>Actions</th></>}
              </tr></thead>
              <tbody>{items.map((item) => (
                <tr key={item._id}>
                  {resource === "users" && <>
                    <td><span className="admin-cell-main">{item.name}</span><span className="admin-cell-sub">{item.email}</span></td>
                    <td><span className="admin-role-tag">{item.role}</span></td>
                    <td>{formatDate(item.createdAt)}</td>
                    <td><AccountStatus user={item} onToggle={confirmFor} /></td>
                  </>}
                  {resource === "artists" && <>
                    <td><span className="admin-cell-main">{item.user?.name || "Artist"}</span><span className="admin-cell-sub">{item.user?.email || "—"}</span><Link className="admin-inline-link" to={`/artists/${item._id}`}>Open profile</Link></td>
                    <td><span className="admin-cell-main">{item.skills?.length ? item.skills.join(", ") : "No skills listed"}</span><span className="admin-cell-sub">{item.experience ?? 0} years experience{item.location ? ` · ${item.location}` : ""}</span></td>
                    <td><span className="admin-cell-main">{item.portfolioCount} items</span>{item.recentPortfolio?.slice(0, 2).map((entry) => <span className="admin-cell-sub" key={entry._id}>{entry.title} · {entry.category}</span>)}</td>
                    <td>{formatDate(item.user?.createdAt)}</td>
                    <td><AccountStatus user={item.user || {}} onToggle={() => confirmFor(item)} /></td>
                  </>}
                  {resource === "studios" && <>
                    <td><span className="admin-cell-main">{item.studioName}</span><span className="admin-cell-sub">{item.user?.email || "—"}</span></td>
                    <td><span className="admin-cell-main">{item.location || "Location not listed"}</span><span className="admin-cell-sub">{safeWebsiteUrl(item.website) ? <a href={safeWebsiteUrl(item.website)} target="_blank" rel="noreferrer">Website</a> : item.description || "No description"}</span></td>
                    <td><span className="admin-cell-main">{item.projectCount} projects</span>{item.recentProjects?.map((project) => <Link className="admin-cell-sub admin-project-link" to={`/projects/${project._id}`} key={project._id}>{project.title} · {project.status}</Link>)}</td>
                    <td>{formatDate(item.user?.createdAt)}</td>
                    <td><AccountStatus user={item.user || {}} onToggle={() => confirmFor(item)} /></td>
                  </>}
                  {resource === "projects" && <>
                    <td><span className="admin-cell-main">{item.title}</span><span className="admin-cell-sub">{item.description}</span><Link className="admin-inline-link" to={`/projects/${item._id}`}>View project</Link></td>
                    <td><span className="admin-cell-main">{item.studio?.name || "Studio unavailable"}</span><span className="admin-cell-sub">{item.studio?.email || "—"}</span></td>
                    <td><span className={`admin-status-tag admin-status-${item.status}`}>{item.status}</span></td>
                    <td>{formatDate(item.createdAt)}</td>
                    <td><button className="admin-text-action admin-danger-action" type="button" onClick={() => confirmFor(item)}>Remove project</button></td>
                  </>}
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        {!loading && totalPages > 1 && (
          <div className="admin-pagination">
            <span>Page {page} of {totalPages} · {pagination.total.toLocaleString()} results</span>
            <div>
              <button className="button button-outline button-small" type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
              <button className="button button-outline button-small" type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          </div>
        )}
      </section>
      {pendingAction && (
        <ConfirmDialog
          title={pendingAction.type === "delete" ? "Remove this project?" : `${pendingAction.isActive ? "Disable" : "Reactivate"} this account?`}
          message={pendingAction.type === "delete"
            ? "This will permanently remove the project listing. This action cannot be undone."
            : `Are you sure you want to ${pendingAction.isActive ? "disable" : "reactivate"} ${pendingAction.item.user?.name || pendingAction.item.name || "this account"}?`}
          confirmLabel={pendingAction.type === "delete" ? "Remove project" : pendingAction.isActive ? "Disable account" : "Reactivate account"}
          loadingLabel={pendingAction.type === "delete" ? "Removing…" : "Updating…"}
          errorMessage={actionError}
          isLoading={isMutating}
          onConfirm={executeAction}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </div>
  );
}

export default AdminCollectionPage;
