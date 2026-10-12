import { useEffect, useState } from "react";
import "./App.css";
import Auth from "./Auth.jsx";
const movies = [
  { id: 1, title: "Interstellar", genre: "Sci-Fi", year: 2014, rating: "8.7", color: "#172c52", symbol: "â—‰", description: "Love transcends the boundaries of space and time." },
  { id: 2, title: "Dune: Part Two", genre: "Adventure", year: 2024, rating: "8.5", color: "#78452e", symbol: "â˜¼", description: "Destiny rises from the sands of Arrakis." },
  { id: 3, title: "Inception", genre: "Thriller", year: 2010, rating: "8.8", color: "#393057", symbol: "âˆž", description: "Enter a world where dreams become reality." },
  { id: 4, title: "The Dark Knight", genre: "Action", year: 2008, rating: "9.0", color: "#303943", symbol: "â—ˆ", description: "One hero. One city. One impossible choice." },
  { id: 5, title: "Avatar", genre: "Fantasy", year: 2009, rating: "7.9", color: "#155a73", symbol: "âœ§", description: "Discover a world beyond imagination." },
  { id: 6, title: "The Martian", genre: "Sci-Fi", year: 2015, rating: "8.0", color: "#a45132", symbol: "â™‚", description: "Millions of miles from home. Never give up." },
  { id: 7, title: "Joker", genre: "Drama", year: 2019, rating: "8.3", color: "#693e50", symbol: "â™ ", description: "Every story has another side." },
  { id: 8, title: "Avengers: Endgame", genre: "Action", year: 2019, rating: "8.4", color: "#4b354e", symbol: "âœ¦", description: "Whatever it takes." },
];

const genres = ["All", "Action", "Adventure", "Drama", "Fantasy", "Sci-Fi", "Thriller"];

function App() {
  const [user, setUser] = useState(
    () => sessionStorage.getItem("auraflix_demo_user") || ""
  );

  function handleLogin(name) {
    sessionStorage.setItem("auraflix_demo_user", name);
    setUser(name);
  }

  function handleLogout() {
    sessionStorage.removeItem("auraflix_demo_user");
    sessionStorage.removeItem("auraflix_access_token");
    setUser("");
  }
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("All");
  
const [saved, setSaved] = useState(() => {
  try {
    return JSON.parse(
      localStorage.getItem("auraflix_watchlist") || "[]"
    );
  } catch {
    return [];
  }
});

useEffect(() => {
  localStorage.setItem("auraflix_watchlist", JSON.stringify(saved));
}, [saved]);
const [showSaved, setShowSaved] = useState(false);
  const [selected, setSelected] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const filteredMovies = movies.filter((movie) => {
    const matchesSearch = movie.title.toLowerCase().includes(search.toLowerCase());
    const matchesGenre = genre === "All" || movie.genre === genre;
    const matchesSaved = !showSaved || saved.includes(movie.id);
    return matchesSearch && matchesGenre && matchesSaved;
  });

  function toggleSaved(id) {
    setSaved((current) =>
      current.includes(id)
        ? current.filter((movieId) => movieId !== id)
        : [...current, id]
    );
  }

 
  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="app-shell">
     <div className="cosmic-glow glow-one" />
      <div className="cosmic-glow glow-two" />

      <header className="navbar">
        <button
          className="brand"
          onClick={() => {
            setShowSaved(false);
            setGenre("All");
            setSearch("");
          }}
          aria-label="AURAFLIX home"
        >
          <span className="brand-symbol">âœ§</span>
          AURA<span>FLIX</span>
          <sup>ULTRA</sup>
        </button>

        <button
          className="mobile-menu"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
        >
          â˜°
        </button>

        <nav className={menuOpen ? "nav-links nav-open" : "nav-links"}>
          <button
            className={!showSaved ? "nav-link active" : "nav-link"}
            onClick={() => {
              setShowSaved(false);
              setMenuOpen(false);
            }}
          >
            Discover
          </button>
          <button
            className={showSaved ? "nav-link active" : "nav-link"}
            onClick={() => {
              setShowSaved(true);
              setMenuOpen(false);
            }}
          >
            My Watchlist <span className="saved-count">{saved.length}</span>
          </button>
        </nav>

       
<div className="nav-status">
  <span className="status-dot" />
  YOUR COSMIC CINEMA

  <button
    type="button"
    onClick={handleLogout}
    style={{
      marginLeft: "12px",
      padding: "8px 12px",
      borderRadius: "8px",
      border: "1px solid rgba(184, 157, 255, 0.3)",
      background: "rgba(20, 15, 40, 0.8)",
      color: "#c4aaff",
      cursor: "pointer",
    }}
  >
    Logout
  </button>
</div>
</header>

      <main>
        <section className="hero">
          <div className="hero-content">
            <div className="eyebrow">
              <span className="eyebrow-line" />
              ENTER ANOTHER UNIVERSE
            </div>

            <h1>
              Every story.
              <br />
              <span>Another universe.</span>
            </h1>

            <p className="hero-description">
              Discover extraordinary movies, unforgettable worlds,
              and stories that stay with you long after the screen fades.
            </p>

            <div className="hero-actions">
              <button
                className="primary-button"
                onClick={() =>
                  document.getElementById("explore")?.scrollIntoView({
                    behavior: "smooth",
                  })
                }
              >
                <span>âœ¦</span> Explore Movies <span>â†—</span>
              </button>

              <button
                className="secondary-button"
                onClick={() => setShowSaved(true)}
              >
                â™¡ My Watchlist
              </button>
            </div>

            <div className="hero-stats">
              <div>
                <strong>âˆž</strong>
                <span>Worlds to discover</span>
              </div>
              <div className="stat-divider" />
              <div>
                <strong>01</strong>
                <span>Your next obsession</span>
              </div>
            </div>
          </div>

          <div className="hero-art" aria-label="Cosmic cinematic artwork">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="orbit orbit-three" />
            <div className="planet">
              <div className="planet-ring" />
              <div className="planet-light" />
            </div>
            <div className="floating-star star-one">âœ¦</div>
            <div className="floating-star star-two">âœ§</div>
            <div className="floating-star star-three">Â·</div>
            <div className="art-caption">
              <span>THE COSMIC COLLECTION</span>
              <strong>BEYOND THE KNOWN</strong>
              <span>FEEL THE STORY. LIVE THE AURA.</span>
            </div>
          </div>
        </section>

        <section className="discovery" id="explore">
          <div className="section-heading">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-line" />
                YOUR NEXT ADVENTURE
              </div>
              <h2>{showSaved ? "Your Watchlist" : "Explore the Universe"}</h2>
              <p>
                {showSaved
                  ? "The stories you want to experience."
                  : "Find a story that speaks to your soul."}
              </p>
            </div>
            <span className="movie-total">
              {filteredMovies.length.toString().padStart(2, "0")} TITLES
            </span>
          </div>

          <div className="search-bar">
            <span className="search-icon" aria-hidden="true">âŒ•</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search movies..."
              aria-label="Search movies"
            />
            {search && (
              <button
                className="clear-search"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                Ã—
              </button>
            )}
          </div>

          <div className="genre-row" aria-label="Filter by genre">
            {genres.map((item) => (
              <button
                key={item}
                className={genre === item ? "genre-chip selected" : "genre-chip"}
                onClick={() => setGenre(item)}
                key={item}
              >
                {item}
              </button>
            ))}
          </div>

          {filteredMovies.length > 0 ? (
            <div className="movie-grid">
              {filteredMovies.map((movie, index) => (
                <article
                  className="movie-card"
                  key={movie.id}
                  style={{ "--delay": `${index * 65}ms` }}
                >
                  <button
                    className="poster-button"
                    onClick={() => setSelected(movie)}
                    aria-label={`View details for ${movie.title}`}
                  >
                    <div
                      className="poster-art"
                      style={{ "--poster-color": movie.color }}
                    >
                      <div className="poster-stars">âœ¦ Â· âœ§ Â· âœ¦</div>
                      <div className="poster-orbit" />
                      <div className="poster-symbol">{movie.symbol}</div>
                      <div className="poster-title">{movie.title}</div>
                      <div className="poster-year">{movie.year}</div>
                      <span className="poster-view">VIEW DETAILS â†—</span>
                    </div>
                  </button>

                  <button
                    className={
                      saved.includes(movie.id)
                        ? "save-button is-saved"
                        : "save-button"
                    }
                    onClick={() => toggleSaved(movie.id)}
                    aria-label={
                      saved.includes(movie.id)
                        ? `Remove ${movie.title} from watchlist`
                        : `Save ${movie.title} to watchlist`
                    }
                    title={
                      saved.includes(movie.id)
                        ? "Remove from watchlist"
                        : "Add to watchlist"
                    }
                  >
                    {saved.includes(movie.id) ? "â™¥" : "â™¡"}
                  </button>

                  <div className="movie-info">
                    <div className="movie-meta">
                      <span>{movie.genre}</span>
                      <span className="rating">â˜… {movie.rating}</span>
                    </div>
                    <button
                      className="movie-name"
                      onClick={() => setSelected(movie)}
                    >
                      {movie.title}
                    </button>
                    <span className="movie-year">{movie.year} Â· Movie</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span>âœ§</span>
              <h3>No stories found</h3>
              <p>Try another search or explore a different genre.</p>
              <button
                className="primary-button"
                onClick={() => {
                  setSearch("");
                  setGenre("All");
                  setShowSaved(false);
                }}
              >
                Explore All Movies
              </button>
            </div>
          )}
        </section>

        <section className="manifesto">
          <span className="manifesto-symbol">âœ§</span>
          <p>Some stories entertain you.</p>
          <h2>Others become a part of you.</h2>
          <span className="manifesto-footer">FEEL THE STORY. LIVE THE AURA.</span>
        </section>
      </main>

      <footer className="footer">
        <button
          className="brand footer-brand"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          âœ§ AURA<span>FLIX</span><sup>ULTRA</sup>
        </button>
        <p>Made for the love of stories.</p>
        <span>DEMO CATALOGUE Â· Â© 2026 AURAFLIX</span>
      </footer>

      {selected && (
        <div
          className="modal-backdrop"
          onClick={() => setSelected(null)}
          role="presentation"
        >
          <section
            className="movie-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setSelected(null)}
              aria-label="Close movie details"
            >
              Ã—
            </button>

            <div
              className="modal-art"
              style={{ "--poster-color": selected.color }}
            >
              <span>{selected.symbol}</span>
            </div>

            <div className="modal-content">
              <span className="eyebrow">COSMIC COLLECTION</span>
              <h2 id="modal-title">{selected.title}</h2>
              <div className="modal-meta">
                {selected.year} <span>Â·</span> {selected.genre}
                <span>Â·</span> â˜… {selected.rating}
              </div>
              <p>{selected.description}</p>
              <p className="demo-notice">
                Sample footage only. This is not the actual selected movie.
              </p>
              <button
                className="primary-button modal-save"
                type="button"
                onClick={() => setPlaying((value) => !value)}
              >
                {playing ? "Stop Demo Playback" : "Play Free Demo Clip"}
              </button>
              {playing && (
                <div className="auraflix-player">
                  <video controls autoPlay playsInline preload="metadata"
                    aria-label="AURAFLIX sample video player"
                    src="https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4">
                    Your browser does not support HTML video.
                  </video>
                  <p>DEMO CLIP · SAMPLE FOOTAGE</p>
                </div>
              )}
              <button
                className="primary-button modal-save"
                onClick={() => toggleSaved(selected.id)}
              >
                {saved.includes(selected.id)
                  ? "â™¥ Saved to Watchlist"
                  : "â™¡ Add to Watchlist"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;

