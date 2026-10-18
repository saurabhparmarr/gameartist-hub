import { Search, SlidersHorizontal, X } from "lucide-react";

function ArtistFilters({ values, onChange, onSubmit, onClear }) {
  const hasFilters = Object.values(values).some(Boolean);

  return (
    <form className="directory-toolbar artist-filters" onSubmit={onSubmit}>
      <label className="directory-search">
        <Search size={18} aria-hidden="true" />
        <span className="sr-only">Search artist name</span>
        <input
          type="search"
          value={values.name}
          onChange={(event) => onChange("name", event.target.value)}
          placeholder="Artist name"
        />
      </label>
      <label className="directory-search">
        <SlidersHorizontal size={17} aria-hidden="true" />
        <span className="sr-only">Filter by skill</span>
        <input
          type="search"
          value={values.skill}
          onChange={(event) => onChange("skill", event.target.value)}
          placeholder="Skill (e.g. Blender)"
        />
      </label>
      <label className="directory-search location-filter">
        <span className="sr-only">Filter by location</span>
        <input
          type="search"
          value={values.location}
          onChange={(event) => onChange("location", event.target.value)}
          placeholder="Location"
        />
      </label>
      <button className="button button-primary filter-submit" type="submit">Search artists</button>
      {hasFilters && (
        <button className="button button-outline filter-clear" type="button" onClick={onClear}>
          <X size={15} /> Clear
        </button>
      )}
    </form>
  );
}

export default ArtistFilters;
