import { Link, useNavigate, useParams } from "react-router-dom";
import clsx from "clsx";
import { getLessonById } from "../data/lessonCatalog";
import { getGlossaryEntry } from "../data/glossary";
import { TooltipTerm } from "../components/TooltipTerm";
import { LearningModulePanel } from "../components/LearningModulePanel";
import { useMiniRtosData } from "../context/miniRtosData";

export function LessonDetailPage() {
  const { lessonId = "" } = useParams();
  const navigate = useNavigate();
  const { runScenario, isRunning, getScenarioById } = useMiniRtosData();

  const lesson = getLessonById(lessonId);

  if (!lesson) {
    return (
      <div className="lesson-detail">
        <section className="panel">
          <h1>Lesson not found</h1>
          <p>We couldn't find that lesson.</p>
          <Link className="primary-button compact" to="/learn">
            Back to all lessons
          </Link>
        </section>
      </div>
    );
  }

  const nextLesson = lesson.nextLessonId
    ? getLessonById(lesson.nextLessonId)
    : undefined;
  const scenario = getScenarioById(lesson.scenarioId);

  async function handleRun() {
    const run = await runScenario(lesson!.scenarioId);
    if (run) {
      navigate("/analysis");
    }
  }

  return (
    <div className="lesson-detail">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/learn">Learn</Link>
        <span aria-hidden="true">/</span>
        <span>
          Module {lesson.moduleNumber}: {lesson.title}
        </span>
      </nav>

      <header className="lesson-detail__header">
        <div className="lesson-detail__badges">
          <span
            className={clsx("level-badge", `level-badge--${lesson.level}`)}
          >
            {lesson.level}
          </span>
          <span className="lesson-detail__time">
            ⏱ {lesson.estimatedMinutes} min
          </span>
        </div>
        <h1>{lesson.title}</h1>
        <p className="lesson-detail__summary">{lesson.summary}</p>
      </header>

      <section className="panel lesson-section">
        <h2>What you'll learn</h2>
        <ul className="check-list">
          {lesson.learningObjectives.map((objective) => (
            <li key={objective}>{objective}</li>
          ))}
        </ul>
      </section>

      <section className="panel lesson-section">
        <h2>Concept</h2>
        {lesson.conceptExplanation.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </section>

      <section className="panel lesson-section lesson-section--analogy">
        <h2>Beginner analogy</h2>
        <p>{lesson.analogy}</p>
      </section>

      <section className="panel lesson-section">
        <h2>Key terms</h2>
        <dl className="key-terms">
          {lesson.keyTerms.map((term) => {
            const entry = getGlossaryEntry(term);
            return (
              <div className="key-terms__item" key={term}>
                <dt>
                  <TooltipTerm term={term} />
                </dt>
                <dd>{entry?.short ?? "See the glossary for a definition."}</dd>
              </div>
            );
          })}
        </dl>
        <Link className="text-link" to="/glossary">
          Open the full glossary →
        </Link>
      </section>

      <section className="panel lesson-section lesson-section--run">
        <p className="eyebrow">Run the simulation</p>
        <h2>{lesson.scenarioName}</h2>
        <p>
          Run the matching scenario to see this concept play out, then read the
          analysis to confirm what you expected.
        </p>

        <h3>Before you run</h3>
        <ul className="check-list">
          {lesson.beforeRunChecklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <button
          type="button"
          className="primary-button"
          onClick={handleRun}
          disabled={isRunning}
        >
          {isRunning ? "Running simulation…" : "Run matching scenario"}
        </button>
        <Link className="text-link lesson-section__alt-link" to="/simulator">
          Or pick a scenario in the Simulator →
        </Link>
      </section>

      <section className="panel lesson-section">
        <h2>What to observe</h2>
        <ul className="eye-list">
          {lesson.whatToObserve.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      {scenario && (
        <details className="lesson-deep-dive">
          <summary>Deep dive: a closer look at this scenario (advanced)</summary>
          <LearningModulePanel scenario={scenario} />
        </details>
      )}

      <section className="panel lesson-section">
        <h2>After the run</h2>
        <p>
          <strong>Expected outcome:</strong> {lesson.expectedOutcome}
        </p>
        <p>{lesson.analysisExplanation}</p>
        <Link className="text-link" to="/analysis">
          Go to the Analysis page →
        </Link>
      </section>

      <nav className="lesson-detail__footer">
        <Link className="ghost-button compact" to="/learn">
          ← All lessons
        </Link>
        {nextLesson ? (
          <Link className="primary-button compact" to={`/learn/${nextLesson.id}`}>
            Next: {nextLesson.title} →
          </Link>
        ) : (
          <Link className="primary-button compact" to="/simulator">
            Finish: explore the Simulator →
          </Link>
        )}
      </nav>
    </div>
  );
}
