import { ArrowUpRight, Dribbble, Instagram, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-main">
          <div className="footer-brand">
            <Link className="brand" to="/">
              <span className="brand-mark" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </span>
              <span>gameartist<span className="brand-accent">hub</span></span>
            </Link>
            <p>A home for the artists building the next worlds we get lost in.</p>
            <div className="footer-socials" aria-label="Social links">
              <a href="https://www.instagram.com/" aria-label="Instagram"><Instagram size={17} /></a>
              <a href="https://dribbble.com/" aria-label="Dribbble"><Dribbble size={17} /></a>
            </div>
          </div>
          <div className="footer-column">
            <h3>Discover</h3>
            <Link to="/artists">Artists</Link>
            <Link to="/artists">Specialties</Link>
            <Link to="/studios">For studios</Link>
          </div>
          <div className="footer-column">
            <h3>GameArtist Hub</h3>
            <Link to="/studios">About the platform</Link>
            <a href="mailto:hello@gameartisthub.com">Contact</a>
            <Link to="/">Home</Link>
          </div>
          <div className="footer-note">
            <Sparkles size={18} />
            <p>Made for the people who make the worlds.</p>
            <Link to="/artists">Find your next collaborator <ArrowUpRight size={15} /></Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} GameArtist Hub</span>
          <span>Built for creative collaboration</span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
