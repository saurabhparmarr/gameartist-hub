import { ArrowDown, ArrowRight, ArrowUpRight, Box, Brush, Clapperboard, Compass, Layers3, Search, Sparkles, WandSparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ArtistCard from "../components/ArtistCard.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import LoadingSkeleton from "../components/LoadingSkeleton.jsx";
import artists from "../data/artists.js";
import { getArtists, getRequestErrorMessage } from "../services/artistService.js";

const categories = [
  { name: "3D Environment", count: "Explore worlds", icon: Box, tone: "violet" },
  { name: "Concept Art", count: "Shape the vision", icon: Brush, tone: "blue" },
  { name: "Character Design", count: "Create a cast", icon: WandSparkles, tone: "pink" },
  { name: "Animation", count: "Bring it to life", icon: Clapperboard, tone: "cyan" },
];

const benefits = [
  {
    number: "01",
    title: "Made for game art",
    description: "Find specialists across concept, 3D, animation, and every craft in between.",
    icon: Layers3,
  },
  {
    number: "02",
    title: "See the work first",
    description: "Explore real portfolios and skills before you start a conversation.",
    icon: Compass,
  },
  {
    number: "03",
    title: "Small teams, big worlds",
    description: "Connect with independent talent ready to help your next idea take shape.",
    icon: Sparkles,
  },
];

function Home() {
  const [search, setSearch] = useState("");
  const [featuredArtists, setFeaturedArtists] = useState([]);
  const [featuredArtistsLoading, setFeaturedArtistsLoading] = useState(true);
  const [featuredArtistsError, setFeaturedArtistsError] = useState("");
  const [featuredArtistsRetry, setFeaturedArtistsRetry] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const controller = new AbortController();
    setFeaturedArtistsLoading(true);
    setFeaturedArtistsError("");

    getArtists({ page: 1, limit: 6 }, controller.signal)
      .then((result) => setFeaturedArtists(result.artists))
      .catch((error) => {
        if (!controller.signal.aborted) {
          setFeaturedArtistsError(getRequestErrorMessage(error));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setFeaturedArtistsLoading(false);
      });

    return () => controller.abort();
  }, [featuredArtistsRetry]);

  function handleSearch(event) {
    event.preventDefault();
    const query = search.trim();
    navigate(query ? `/artists?search=${encodeURIComponent(query)}` : "/artists");
  }

  return (
    <>
      <section className="hero-section">
        <div className="hero-glow" aria-hidden="true" />
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> THE CREATIVE NETWORK FOR GAMES</div>
            <h1>Where game worlds <span>come to life.</span></h1>
            <p className="hero-description">
              Discover the independent artists turning bold ideas into unforgettable worlds, characters, and experiences.
            </p>
            <form className="hero-search" onSubmit={handleSearch}>
              <Search size={19} aria-hidden="true" />
              <label className="sr-only" htmlFor="artist-search">Search artists by skill or specialty</label>
              <input
                id="artist-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Try “environment artist” or “Blender”"
              />
              <button type="submit" aria-label="Search artists"><ArrowRight size={19} /></button>
            </form>
            <div className="hero-actions">
              <Link className="button button-primary" to="/artists">Explore artists <ArrowUpRight size={17} /></Link>
              <Link className="button button-quiet" to="/artists">Join as an artist <ArrowRight size={16} /></Link>
            </div>
            <div className="hero-proof">
              <div className="avatar-stack" aria-hidden="true">
                {artists.slice(0, 4).map((artist) => <img key={artist.id} src={artist.avatar} alt="" />)}
              </div>
              <p><strong>Made for creative teams</strong><span>Find your next collaborator</span></p>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-art-main">
              <img
                src="https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1400&q=90"
                alt="Dreamlike forest environment created for a game world"
              />
              <div className="hero-art-overlay">
                <span className="artwork-kicker">WORLDS IN PROGRESS · 01</span>
                <p>Somewhere<br />between here and myth.</p>
                <span className="artwork-credit">Environment concept · Maya Chen</span>
              </div>
            </div>
            <div className="floating-chip chip-artists"><span className="chip-icon"><Sparkles size={17} /></span><span><strong>Fresh perspectives</strong><small>Independent talent</small></span></div>
            <div className="floating-chip chip-specialty"><span className="chip-live" /><span><strong>World builder</strong><small>Unreal Engine · Blender</small></span></div>
            <div className="hero-orbit" aria-hidden="true"><span /><span /><span /></div>
          </div>
        </div>
        <a className="scroll-hint" href="#featured"><ArrowDown size={15} /> Scroll to explore</a>
      </section>

      <section className="section featured-section" id="featured">
        <div className="container">
          <div className="section-heading">
            <div>
              <div className="eyebrow"><span className="eyebrow-dot" /> GOOD PEOPLE, GREAT WORK</div>
              <h2>Meet your next creative <span>collaborator.</span></h2>
            </div>
            <Link className="button button-outline" to="/artists">Browse all artists <ArrowUpRight size={16} /></Link>
          </div>
          {featuredArtistsError ? (
            <ErrorMessage
              message={featuredArtistsError}
              onRetry={() => setFeaturedArtistsRetry((retry) => retry + 1)}
            />
          ) : featuredArtistsLoading ? (
            <LoadingSkeleton count={3} />
          ) : featuredArtists.length ? (
            <div className="artist-grid">
              {featuredArtists.map((artist) => <ArtistCard key={artist._id} artist={artist} featured />)}
            </div>
          ) : (
            <EmptyState
              title="No artist profiles yet"
              message="Published artist profiles will appear here."
            />
          )}
        </div>
      </section>

      <section className="section category-section" id="categories">
        <div className="container">
          <div className="category-heading">
            <div className="eyebrow"><span className="eyebrow-dot" /> FIND YOUR CRAFT</div>
            <h2>Every world needs <span>artists.</span></h2>
            <p>From the first sketch to the final frame, find the right creative for every part of your game.</p>
          </div>
          <div className="category-grid">
            {categories.map(({ name, count, icon: Icon, tone }, index) => (
              <Link
                className={`category-card category-${tone}`}
                key={name}
                to={`/artists?category=${encodeURIComponent(name)}`}
              >
                <div className="category-number">0{index + 1}</div>
                <span className="category-icon"><Icon size={22} /></span>
                <div><h3>{name}</h3><p>{count}</p></div>
                <ArrowUpRight className="category-arrow" size={19} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section why-section">
        <div className="container why-grid">
          <div className="why-intro">
            <div className="eyebrow"><span className="eyebrow-dot" /> BUILT FOR THE WAY GAMES GET MADE</div>
            <h2>Great games start with <span>great people.</span></h2>
            <p>Finding the right artist shouldn't feel like searching another universe. GameArtist Hub brings the game-art community closer, so great ideas can find great collaborators.</p>
            <Link className="button button-outline" to="/studios">For studios <ArrowUpRight size={16} /></Link>
          </div>
          <div className="benefit-list">
            {benefits.map(({ number, title, description, icon: Icon }) => (
              <article className="benefit-item" key={number}>
                <span className="benefit-number">{number}</span>
                <span className="benefit-icon"><Icon size={21} /></span>
                <div><h3>{title}</h3><p>{description}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section closing-section">
        <div className="container">
          <div className="closing-card">
            <div className="closing-art" aria-hidden="true" />
            <div className="closing-content">
              <span className="closing-icon"><Sparkles size={20} /></span>
              <div className="eyebrow">YOUR NEXT WORLD STARTS HERE</div>
              <h2>Have a world to build?</h2>
              <p>Meet the artists who can help bring it to life.</p>
              <Link className="button button-light" to="/artists">Discover artists <ArrowUpRight size={17} /></Link>
            </div>
            <span className="closing-sparkle sparkle-one">✳</span>
            <span className="closing-sparkle sparkle-two">✳</span>
          </div>
        </div>
      </section>
    </>
  );
}

export default Home;
