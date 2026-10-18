import { useEffect, useMemo, useState } from "react";
import { Users } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import ArtistFilters from "../components/ArtistFilters.jsx";
import ArtistGrid from "../components/ArtistGrid.jsx";
import { getArtists, getRequestErrorMessage } from "../services/artistService.js";

const pageSize = 12;

function readFilters(searchParams) {
  return {
    name: searchParams.get("name") || "",
    skill: searchParams.get("skill") || searchParams.get("search") || searchParams.get("category") || "",
    location: searchParams.get("location") || "",
  };
}

function Artists() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedPage = Number(searchParams.get("page"));
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const filters = useMemo(() => readFilters(searchParams), [searchParams]);
  const [draftFilters, setDraftFilters] = useState(filters);
  const [artists, setArtists] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setDraftFilters(filters);
  }, [filters]);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError("");

    getArtists({ ...filters, page, limit: pageSize }, controller.signal)
      .then((result) => {
        setArtists(result.artists);
        setPagination(result.pagination);
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) {
          setError(getRequestErrorMessage(requestError));
          setArtists([]);
          setPagination(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [filters, page, retryCount]);

  function updateDraft(field, value) {
    setDraftFilters((current) => ({ ...current, [field]: value }));
  }

  function submitFilters(event) {
    event.preventDefault();
    const nextParams = new URLSearchParams();
    for (const [field, value] of Object.entries(draftFilters)) {
      if (value.trim()) nextParams.set(field, value.trim());
    }
    setSearchParams(nextParams);
  }

  function clearFilters() {
    setDraftFilters({ name: "", skill: "", location: "" });
    setSearchParams({});
  }

  function goToPage(nextPage) {
    const nextParams = new URLSearchParams(searchParams);
    if (nextPage === 1) nextParams.delete("page");
    else nextParams.set("page", String(nextPage));
    setSearchParams(nextParams);
  }

  return (
    <section className="directory-page">
      <div className="directory-hero">
        <div className="container directory-hero-content">
          <div className="eyebrow"><span className="eyebrow-dot" /> THE GAME ART COMMUNITY</div>
          <h1>Meet the artists<br /><span>behind the worlds.</span></h1>
          <p>Explore independent artists, discover their craft, and find the creative voice your project needs.</p>
          <div className="directory-count">
            <Users size={17} />
            <strong>{pagination?.total ?? "—"} artists</strong>
            <span>in the community</span>
          </div>
        </div>
      </div>
      <div className="container directory-content">
        <ArtistFilters
          values={draftFilters}
          onChange={updateDraft}
          onSubmit={submitFilters}
          onClear={clearFilters}
        />
        <div className="directory-results">
          <h2>{filters.name || filters.skill || filters.location ? "Search results" : "All artists"}</h2>
          <span>
            {pagination
              ? `${pagination.total} ${pagination.total === 1 ? "artist" : "artists"}`
              : isLoading ? "Loading…" : "—"}
          </span>
        </div>
        <ArtistGrid
          artists={artists}
          isLoading={isLoading}
          error={error}
          onClearFilters={clearFilters}
          onRetry={() => setRetryCount((count) => count + 1)}
        />
        {!isLoading && !error && pagination?.totalPages > 1 && (
          <nav className="artist-pagination" aria-label="Artist results pages">
            <button
              className="button button-outline"
              type="button"
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
            >
              Previous
            </button>
            <span>Page {pagination.page} of {pagination.totalPages}</span>
            <button
              className="button button-outline"
              type="button"
              disabled={page >= pagination.totalPages}
              onClick={() => goToPage(page + 1)}
            >
              Next
            </button>
          </nav>
        )}
      </div>
    </section>
  );
}

export default Artists;
