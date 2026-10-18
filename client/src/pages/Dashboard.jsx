import { ArrowRight, Layers3, LogOut, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isArtist = user.role === "artist";

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <section className="dashboard-page">
      <div className="dashboard-card">
        <span className="dashboard-icon">{isArtist ? <Sparkles size={24} /> : <Layers3 size={24} />}</span>
        <span className="eyebrow"><span className="eyebrow-dot" /> {isArtist ? "ARTIST SPACE" : "STUDIO SPACE"}</span>
        <h1>Welcome, <span>{user.name}.</span></h1>
        <p>This is a temporary {isArtist ? "artist" : "studio"} dashboard. Your account is connected to the GameArtist Hub backend.</p>
        <div className="dashboard-user">
          <span>ACCOUNT</span><strong>{user.email}</strong>
          <span>ACCOUNT TYPE</span><strong>{isArtist ? "Artist" : "Studio"}</strong>
        </div>
        <div className="dashboard-actions">
          <Link className="button button-outline" to="/"><ArrowRight size={16} /> Back to the site</Link>
          <button className="button dashboard-logout" type="button" onClick={handleLogout}><LogOut size={16} /> Log out</button>
        </div>
      </div>
    </section>
  );
}

export default Dashboard;
