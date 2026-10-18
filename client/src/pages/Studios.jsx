import { ArrowRight, ArrowUpRight, Check, Layers3, Search, Sparkles, Users } from "lucide-react";
import { Link } from "react-router-dom";

const steps = [
  { number: "01", title: "Explore the work", text: "Browse portfolios across game-art specialties and get a feel for each artist's creative style." },
  { number: "02", title: "Find your fit", text: "Use skills and specialties to narrow down the artists who suit your project and team." },
  { number: "03", title: "Start a conversation", text: "Reach out directly and bring the right creative people into your next game." },
];

function Studios() {
  return (
    <section className="studios-page">
      <div className="studios-hero">
        <div className="container studios-hero-grid">
          <div className="studios-hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> FOR INDEPENDENT GAME STUDIOS</div>
            <h1>Build your world.<br /><span>Find your people.</span></h1>
            <p>Meet independent game artists with the imagination and craft to help your next project take shape.</p>
            <Link className="button button-primary" to="/artists">Discover artists <ArrowUpRight size={17} /></Link>
            <div className="studio-proof"><span><Check size={14} /> Browse real portfolios</span><span><Check size={14} /> Find specialist talent</span></div>
          </div>
          <div className="studios-art">
            <img src="https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1200&q=85" alt="Atmospheric fantasy landscape concept art" />
            <div className="studio-art-caption"><span className="studio-art-icon"><Sparkles size={17} /></span><span><strong>A universe of ideas</strong><small>Made by independent artists</small></span></div>
            <div className="studio-art-side"><Layers3 size={18} /><span>ART FOR EVERY<br />STAGE OF YOUR GAME</span></div>
          </div>
        </div>
      </div>
      <div className="container studio-stats">
        <div><Users size={20} /><span><strong>Independent talent</strong><small>Creative voices from everywhere</small></span></div>
        <div><Search size={20} /><span><strong>Made to discover</strong><small>Find artists by their craft</small></span></div>
        <div><Sparkles size={20} /><span><strong>Built for games</strong><small>Artistry across game production</small></span></div>
      </div>
      <section className="section studio-steps">
        <div className="container">
          <div className="category-heading">
            <div className="eyebrow"><span className="eyebrow-dot" /> A BETTER WAY TO FIND YOUR CREW</div>
            <h2>From “what if” to <span>what's next.</span></h2>
            <p>Make finding the right creative partner the easiest part of building your game.</p>
          </div>
          <div className="steps-grid">
            {steps.map((step) => (
              <article className="step-card" key={step.number}>
                <span className="step-number">{step.number}</span>
                <div className="step-line" />
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="section studio-bottom-cta">
        <div className="container">
          <div className="studio-cta-panel">
            <div><div className="eyebrow"><span className="eyebrow-dot" /> YOUR NEXT COLLABORATION IS OUT THERE</div><h2>Let's make something <span>players remember.</span></h2></div>
            <Link className="button button-primary" to="/artists">Meet the artists <ArrowRight size={17} /></Link>
          </div>
        </div>
      </section>
    </section>
  );
}

export default Studios;
