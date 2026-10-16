import { useEffect, useRef, useState } from "react";
import "./App.css";
import Auth from "./Auth.jsx";

const API_BASE = (import.meta.env.VITE_API_URL || "https://auraflix-ultra-api.onrender.com").replace(/\/$/, "");
const movies = [
  { id: 1, title: "Interstellar", genre: "Sci-Fi", year: 2014, rating: "8.7", color: "#172c52", symbol: "◉", description: "Love transcends the boundaries of space and time." },
  { id: 2, title: "Dune: Part Two", genre: "Adventure", year: 2024, rating: "8.5", color: "#78452e", symbol: "❋", description: "Destiny rises from the sands of Arrakis." },
  { id: 3, title: "Inception", genre: "Thriller", year: 2010, rating: "8.8", color: "#393057", symbol: "∞", description: "Enter a world where dreams become reality." },
  { id: 4, title: "The Dark Knight", genre: "Action", year: 2008, rating: "9.0", color: "#303943", symbol: "◆", description: "One hero. One city. One impossible choice." },
  { id: 5, title: "Avatar", genre: "Fantasy", year: 2009, rating: "7.9", color: "#155a73", symbol: "✧", description: "Discover a world beyond imagination." },
  { id: 6, title: "The Martian", genre: "Sci-Fi", year: 2015, rating: "8.0", color: "#a45132", symbol: "♨", description: "Millions of miles from home. Never give up." },
  { id: 7, title: "Joker", genre: "Drama", year: 2019, rating: "8.3", color: "#693e50", symbol: "♟", description: "Every story has another side." },
  { id: 8, title: "Avengers: Endgame", genre: "Action", year: 2019, rating: "8.4", color: "#4b354e", symbol: "✦", description: "Whatever it takes." },
  { id: 9, title: "12 Angry Men", genre: "Drama", year: 1957, rating: "9.0", color: "#594b42", symbol: "⚖", description: "Twelve jurors. One life-changing decision." },
  { id: 10, title: "Psycho", genre: "Thriller", year: 1960, rating: "8.5", color: "#353342", symbol: "◈", description: "A landmark psychological thriller." },
  { id: 11, title: "The Godfather", genre: "Drama", year: 1972, rating: "9.2", color: "#45352c", symbol: "♛", description: "An iconic saga of family and power." },
  { id: 12, title: "Alien", genre: "Sci-Fi", year: 1979, rating: "8.5", color: "#344b49", symbol: "☄", description: "A crew faces a terrifying life-form in deep space." },
  { id: 13, title: "Back to the Future", genre: "Adventure", year: 1985, rating: "8.5", color: "#345b78", symbol: "⌁", description: "A time-travel adventure that changes everything." },
  { id: 14, title: "Jurassic Park", genre: "Adventure", year: 1993, rating: "8.2", color: "#3d583b", symbol: "♧", description: "A prehistoric world comes alive." },
  { id: 15, title: "The Matrix", genre: "Sci-Fi", year: 1999, rating: "8.7", color: "#25463e", symbol: "⌘", description: "Question the reality you know." },
  { id: 16, title: "Gladiator", genre: "Action", year: 2000, rating: "8.5", color: "#6b4635", symbol: "⚔", description: "A warrior seeks justice in the arena." },
  { id: 17, title: "Spirited Away", genre: "Fantasy", year: 2001, rating: "8.6", color: "#536b63", symbol: "✿", description: "A young girl discovers a mysterious spirit world." },
  { id: 18, title: "The Prestige", genre: "Thriller", year: 2006, rating: "8.5", color: "#493b5b", symbol: "✧", description: "Two magicians become consumed by rivalry." },
  { id: 19, title: "Gravity", genre: "Sci-Fi", year: 2013, rating: "7.7", color: "#29445d", symbol: "◉", description: "Survival becomes a fight against the void." },
  { id: 20, title: "Everything Everywhere All at Once", genre: "Adventure", year: 2022, rating: "7.8", color: "#68475e", symbol: "∞", description: "One family faces an extraordinary multiverse." },
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
  const [releaseYear, setReleaseYear] = useState("All");
  
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

const [watchlistCloudToken, setWatchlistCloudToken] = useState("");
const [watchlistMessage, setWatchlistMessage] = useState("");
const saveQueue = useRef(Promise.resolve());

useEffect(() => {
  const token = sessionStorage.getItem("auraflix_access_token");

  if (!user || !token) return;

  let cancelled = false;

  async function loadCloudWatchlist() {
    try {
      const response = await fetch(`${API_BASE}/watchlist`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? "Your session expired. Please sign in again."
            : `Could not load cloud watchlist (${response.status}).`
        );
      }

      const data = await response.json();
      const cloudIds = Array.isArray(data.movie_ids)
        ? [...new Set(data.movie_ids.filter(
            (id) => Number.isInteger(id) && id > 0
          ))]
        : [];

      if (cancelled) return;

      setSaved(cloudIds);
      localStorage.setItem("auraflix_watchlist", JSON.stringify(cloudIds));
      setWatchlistCloudToken(token);
    } catch (error) {
      if (!cancelled) {
        setWatchlistMessage(
          `${error.message} Your local watchlist is preserved; cloud sync is paused.`
        );
      }
    }
  }

  loadCloudWatchlist();

  return () => {
    cancelled = true;
  };
}, [user]);

useEffect(() => {
  const token = sessionStorage.getItem("auraflix_access_token");

  // Never upload local data until this account's cloud list has loaded.
  if (!user || !token || watchlistCloudToken !== token) return;

  const movieIds = [...saved];

  saveQueue.current = saveQueue.current
    .catch(() => {})
    .then(async () => {
      // Ignore queued snapshots if the account changed before this save ran.
      if (sessionStorage.getItem("auraflix_access_token") !== token) return;

      const response = await fetch(`${API_BASE}/watchlist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ movie_ids: movieIds }),
      });

      if (!response.ok) {
        throw new Error(`Cloud save failed (${response.status}).`);
      }
    })
    .catch((error) => {
      setWatchlistMessage(
        `${error.message} Your local watchlist remains available.`
      );
    });
}, [saved, user, watchlistCloudToken]);
const [showSaved, setShowSaved] = useState(false);
  const [selected, setSelected] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const filteredMovies = movies.filter((movie) => {
    const matchesSearch = movie.title.toLowerCase().includes(search.toLowerCase());
    const matchesGenre = genre === "All" || movie.genre === genre;
    const matchesYear = releaseYear === "All" || movie.year === Number(releaseYear);
    const matchesSaved = !showSaved || saved.includes(movie.id);
    return matchesSearch && matchesGenre && matchesYear && matchesSaved;
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
          <span className="brand-symbol">✧</span>
          AURA<span>FLIX</span>
          <sup>ULTRA</sup>
        </button>

        <button
          className="mobile-menu"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
        >
          ☼
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
                <span>✦</span> Explore Movies <span>→</span>
              </button>

              <button
                className="secondary-button"
                onClick={() => setShowSaved(true)}
              >
                ♡ My Watchlist
              </button>
            </div>

            <div className="hero-stats">
              <div>
                <strong>∞</strong>
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
            <div className="floating-star star-one">✦</div>
            <div className="floating-star star-two">✧</div>
            <div className="floating-star star-three">·</div>
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
            {watchlistMessage && <p role="status">{watchlistMessage}</p>}
            <span className="movie-total">
              {filteredMovies.length.toString().padStart(2, "0")} TITLES
            </span>
          </div>

          <div className="search-bar">
            <span className="search-icon" aria-hidden="true">⌕</span>
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
                ×
              </button>
            )}
          </div>

          <div className="catalogue-filters">
            <label htmlFor="release-year">RELEASE YEAR</label>
            <select
              id="release-year"
              value={releaseYear}
              onChange={(event) => setReleaseYear(event.target.value)}
              aria-label="Filter by release year"
            >
              <option value="All">All years</option>
              {[...new Set(movies.map((movie) => movie.year))]
                .sort((a, b) => b - a)
                .map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
            </select>
            <span>CLASSICS TO NEW RELEASES</span>
          </div>

          <div className="genre-row" aria-label="Filter by genre">
            {genres.map((item) => (
              <button
                key={item}
                className={genre === item ? "genre-chip selected" : "genre-chip"}
                onClick={() => setGenre(item)}
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
                      <div className="poster-stars">✦ · ✧ · ✦</div>
                      <div className="poster-orbit" />
                      <div className="poster-symbol">{movie.symbol}</div>
                      <div className="poster-title">{movie.title}</div>
                      <div className="poster-year">{movie.year}</div>
                      <span className="poster-view">VIEW DETAILS →</span>
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
                    {saved.includes(movie.id) ? "♥" : "♡"}
                  </button>

                  <div className="movie-info">
                    <div className="movie-meta">
                      <span>{movie.genre}</span>
                      <span className="rating">★ {movie.rating}</span>
                    </div>
                    <button
                      className="movie-name"
                      onClick={() => setSelected(movie)}
                    >
                      {movie.title}
                    </button>
                    <span className="movie-year">{movie.year} · Movie</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span>✧</span>
              <h3>No stories found</h3>
              <p>Try another search or explore a different genre.</p>
              <button
                className="primary-button"
                onClick={() => {
                  setSearch("");
                  setGenre("All");
                  setReleaseYear("All");
                  setShowSaved(false);
                }}
              >
                Explore All Movies
              </button>
            </div>
          )}
        </section>

        <section className="manifesto">
          <span className="manifesto-symbol">✧</span>
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
          ✧ AURA<span>FLIX</span><sup>ULTRA</sup>
        </button>
        <p>Made for the love of stories.</p>
        <span>DEMO CATALOGUE · © 2026 AURAFLIX</span>
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
              ×
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
                {selected.year} <span>·</span> {selected.genre}
                <span>·</span> ★ {selected.rating}
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
                  ? "♥ Saved to Watchlist"
                  : "♡ Add to Watchlist"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;







