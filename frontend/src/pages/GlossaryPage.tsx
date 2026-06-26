import { useMemo, useState } from "react";
import { glossary } from "../data/glossary";

export function GlossaryPage() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return glossary;
    return glossary.filter(
      (entry) =>
        entry.term.toLowerCase().includes(q) ||
        entry.full.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <div className="glossary-page">
      <section className="page-header">
        <p className="eyebrow">Glossary</p>
        <h1>Embedded systems &amp; RTOS terms</h1>
        <p className="page-header__subtitle">
          Plain-English definitions for the words you'll meet across the
          lessons, simulator, and analysis.
        </p>
        <input
          type="search"
          className="glossary-search"
          placeholder="Search terms…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search glossary"
        />
      </section>

      {filtered.length === 0 ? (
        <p className="empty-state">No terms match “{query}”.</p>
      ) : (
        <dl className="glossary-grid">
          {filtered.map((entry) => (
            <div
              className="glossary-card"
              key={entry.term}
              id={entry.term.toLowerCase().replace(/\s+/g, "-")}
            >
              <dt>{entry.term}</dt>
              <dd>{entry.full}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
