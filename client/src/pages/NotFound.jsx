import { ArrowLeft, Compass } from "lucide-react";
import { Link } from "react-router-dom";

function NotFound() {
  return (
    <section className="not-found-page">
      <div className="not-found-orb"><Compass size={34} /></div>
      <span className="eyebrow"><span className="eyebrow-dot" /> OFF THE MAP</span>
      <h1>Looks like this world<br /><span>is still loading.</span></h1>
      <p>We couldn't find the page you were looking for. Let's get you back to the good stuff.</p>
      <Link className="button button-primary" to="/"><ArrowLeft size={16} /> Back to home</Link>
    </section>
  );
}

export default NotFound;
