import { useId, type ReactNode } from "react";
import { getGlossaryEntry } from "../data/glossary";

interface TooltipTermProps {
  /** Glossary term (or alias) to look up the plain-English definition. */
  term: string;
  /** Display text, defaults to the term itself. */
  children?: ReactNode;
}

/*
 * Inline beginner term with a hover/focus tooltip sourced from the glossary.
 * The definition is kept short (<30 words) in glossary.ts. If a term has no
 * glossary entry, the text renders plainly so the component is always safe to
 * use anywhere a beginner term appears (cards, tables, logs, analysis).
 */
export function TooltipTerm({ term, children }: TooltipTermProps) {
  const entry = getGlossaryEntry(term);
  const tooltipId = useId();
  const content = children ?? term;

  if (!entry) {
    return <>{content}</>;
  }

  return (
    <span className="tooltip-term" tabIndex={0} aria-describedby={tooltipId}>
      {content}
      <span className="tooltip-term__indicator" aria-hidden="true">
        i
      </span>
      <span className="tooltip-bubble" role="tooltip" id={tooltipId}>
        <strong>{entry.term}</strong>
        {entry.short}
      </span>
    </span>
  );
}
