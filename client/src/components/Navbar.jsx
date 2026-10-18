import { useState } from "react";
import { ArrowUpRight, LogOut, Mail, Menu, X } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { getDashboardPath } from "../services/authService.js";

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const closeMenu = () => setMenuOpen(false);

  function handleLogout() {
    logout();
    closeMenu();
    navigate("/login", { replace: true });
  }

  return (
    <header className="site-header">
      <div className="container nav-shell">
        <Link className="brand" to="/" onClick={closeMenu} aria-label="GameArtist Hub home">
          <span className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </span>
          <span>gameartist<span className="brand-accent">hub</span></span>
        </Link>

        <button
          className="menu-toggle"
          type="button"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>

        <nav className={`nav-links${menuOpen ? " nav-links-open" : ""}`} aria-label="Main navigation">
          <NavLink to="/artists" onClick={closeMenu}>Discover Artists</NavLink>
          <NavLink to="/studios" onClick={closeMenu}>Studios</NavLink>
          <NavLink to="/projects" onClick={closeMenu}>Projects</NavLink>
          {isAuthenticated && <NavLink to="/messages" onClick={closeMenu}><Mail size={14} /> Messages</NavLink>}
          {isAuthenticated ? (
            <>
              <Link className="nav-login" to={getDashboardPath(user.role)} onClick={closeMenu}>Dashboard</Link>
              <button className="button button-small button-outline nav-join" type="button" onClick={handleLogout}>
                Log out <LogOut size={14} />
              </button>
            </>
          ) : (
            <>
              <Link className="nav-login" to="/login" onClick={closeMenu}>Log in</Link>
              <Link className="button button-small button-primary nav-join" to="/register" onClick={closeMenu}>
                Join as Artist <ArrowUpRight size={15} />
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
