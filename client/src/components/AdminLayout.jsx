import { useState } from "react";
import {
  BriefcaseBusiness,
  Building2,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const links = [
  { to: "/admin/dashboard", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/artists", label: "Artists", icon: UserRound },
  { to: "/admin/studios", label: "Studios", icon: Building2 },
  { to: "/admin/projects", label: "Projects", icon: BriefcaseBusiness },
];

function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/admin/login", { replace: true });
  }

  return (
    <section className="admin-shell">
      <div className="admin-mobile-top">
        <Link className="admin-mobile-title" to="/admin/dashboard">
          <ShieldCheck size={19} /> Admin console
        </Link>
        <button
          className="menu-toggle"
          type="button"
          aria-expanded={menuOpen}
          aria-label="Toggle admin menu"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      <aside className={`admin-sidebar${menuOpen ? " admin-sidebar-open" : ""}`}>
        <Link className="admin-brand" to="/admin/dashboard">
          <span className="admin-brand-icon"><ShieldCheck size={19} /></span>
          <span><strong>GameArtist Hub</strong><small>ADMIN CONSOLE</small></span>
        </Link>
        <div className="admin-identity">
          <span className="admin-identity-avatar"><UserRound size={17} /></span>
          <span><strong>{user.name}</strong><small>{user.email}</small></span>
        </div>
        <nav aria-label="Admin navigation">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMenuOpen(false)}
            >
              <Icon size={17} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <Link to="/" onClick={() => setMenuOpen(false)}>View public site</Link>
          <button type="button" onClick={handleLogout}>
            <LogOut size={16} /> Log out
          </button>
        </div>
      </aside>
      <main className="admin-content"><Outlet /></main>
    </section>
  );
}

export default AdminLayout;
