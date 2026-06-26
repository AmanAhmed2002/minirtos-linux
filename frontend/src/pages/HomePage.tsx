import { Link } from "react-router-dom";
import { lessonCatalog } from "../data/lessonCatalog";

const HERO_CARDS = [
  {
    title: "New to embedded systems?",
    text: "Start with short beginner lessons that explain tasks, queues, scheduling, deadlines, and watchdogs.",
    ctaLabel: "Start Module 0",
    to: `/learn/${lessonCatalog[0].id}`,
  },
  {
    title: "Want to experiment?",
    text: "Run RTOS scenarios and compare how different failures affect timing, messages, and system health.",
    ctaLabel: "Open Simulator",
    to: "/simulator",
  },
  {
    title: "Review system behavior",
    text: "Inspect logs, warnings, missed deadlines, dropped messages, and analyzer summaries from previous runs.",
    ctaLabel: "View Analysis",
    to: "/analysis",
  },
];

const HOW_IT_WORKS = [
  { step: 1, label: "Learn the concept" },
  { step: 2, label: "Run the matching simulation" },
  { step: 3, label: "Read the logs and analysis" },
  { step: 4, label: "Compare behavior across scenarios" },
];

const WHAT_YOU_LEARN = [
  "Embedded systems basics",
  "RTOS tasks and priorities",
  "Preemptive scheduling",
  "Deadline misses",
  "Queue overflows and dropped messages",
  "Watchdog recovery",
  "Linux scheduler differences",
  "How to interpret runtime logs",
];

export function HomePage() {
  return (
    <div className="home-page">
      <section className="hero">
        <p className="eyebrow">Learn embedded systems by doing</p>
        <h1>MiniRTOS Playground</h1>
        <p className="hero__subtitle">
          Learn how embedded systems schedule tasks, handle deadlines, pass
          messages, and recover from failures through live RTOS simulations.
        </p>
        <div className="hero__cta-row">
          <Link className="primary-button" to="/learn">
            Start Learning
          </Link>
          <Link className="ghost-button" to="/simulator">
            Run Simulator
          </Link>
        </div>
      </section>

      <section className="home-cards">
        {HERO_CARDS.map((card) => (
          <article className="home-card" key={card.title}>
            <h3>{card.title}</h3>
            <p>{card.text}</p>
            <Link className="text-link" to={card.to}>
              {card.ctaLabel} →
            </Link>
          </article>
        ))}
      </section>

      <section className="panel home-section">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">How it works</p>
            <h2>A four-step learning loop</h2>
          </div>
        </div>
        <ol className="how-it-works">
          {HOW_IT_WORKS.map((item) => (
            <li key={item.step}>
              <span className="how-it-works__num">{item.step}</span>
              <span className="how-it-works__label">{item.label}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="panel home-section">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">What you will learn</p>
            <h2>From first principles to reading real telemetry</h2>
          </div>
        </div>
        <ul className="learn-list">
          {WHAT_YOU_LEARN.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <Link className="primary-button compact" to="/learn">
          Browse all modules
        </Link>
      </section>
    </div>
  );
}
