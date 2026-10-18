import { useState } from "react";
import { BriefcaseBusiness, Compass, LayoutDashboard, LogOut, Mail, Menu, UserRound, Users, X } from "lucide-react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

function DashboardLayout({ role }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isArtist = role === "artist";
  const basePath = isArtist ? "/artist/dashboard" : "/studio/dashboard";
  const links = isArtist
    ? [
        { to: basePath, label: "Overview", icon: LayoutDashboard, end: true },
        { to: "/artists", label: "Discover artists", icon: Compass },
        { to: "/messages", label: "Messages", icon: Mail },
      ]
    : [
        { to: basePath, label: "Overview", icon: LayoutDashboard, end: true },
        { to: "/studio/projects", label: "Projects", icon: BriefcaseBusiness },
        { to: "/studio/saved-artists", label: "Saved artists", icon: Users },
        { to: "/artists", label: "Discover artists", icon: Compass },
        { to: "/messages", label: "Messages", icon: Mail },
      ];

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <section className="dashboard-shell">
      <div className="container dashboard-shell-container">
        <div className="dashboard-mobile-top">
          <Link className="dashboard-mobile-title" to={basePath}>{isArtist ? "Artist space" : "Studio space"}</Link>
          <button className="menu-toggle" type="button" aria-expanded={menuOpen} aria-label="Toggle dashboard menu" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        <div className="dashboard-shell-grid">
          <aside className={`dashboard-sidebar${menuOpen ? " dashboard-sidebar-open" : ""}`}>
            <div className="dashboard-sidebar-heading">
              <span className="dashboard-sidebar-mark">{isArtist ? <UserRound size={18} /> : <BriefcaseBusiness size={18} />}</span>
              <span><strong>{isArtist ? "Artist space" : "Studio space"}</strong><small>{user.name}</small></span>
            </div>
            <nav aria-label="Dashboard navigation">
              {links.map(({ to, label, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end} onClick={() => setMenuOpen(false)}>
                  <Icon size={17} /> {label}
                </NavLink>
              ))}
            </nav>
            <div className="dashboard-sidebar-bottom">
              <Link to="/" onClick={() => setMenuOpen(false)}>Back to GameArtist Hub</Link>
              <button type="button" onClick={handleLogout}><LogOut size={16} /> Log out</button>
            </div>
          </aside>
          <main className="dashboard-content"><Outlet /></main>
        </div>
      </div>
    </section>
  );
}

export default DashboardLayout;
