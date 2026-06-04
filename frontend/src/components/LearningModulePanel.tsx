import type { ScenarioResponse } from "../types/api";
import { getScenarioLearningContent } from "../content/learningContent";

interface LearningModulePanelProps {
  scenario: ScenarioResponse | null;
}

export function LearningModulePanel({ scenario }: LearningModulePanelProps) {
  const content = getScenarioLearningContent(scenario);

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Guided Learning</p>
          <h2>What this scenario teaches</h2>
        </div>
      </div>

      <p className="learning-headline">{content.headline}</p>

      <div className="concept-card-grid">
        {content.conceptModules.map((module) => (
          <article className="concept-card" key={module.title}>
            <h3>{module.title}</h3>

            <p>{module.summary}</p>

            <div className="concept-section">
              <span>Why it matters</span>
              <p>{module.whyItMatters}</p>
            </div>

            <div className="concept-section">
              <span>Signals to watch</span>
              <div className="signal-chip-list">
                {module.signalsToWatch.map((signal) => (
                  <strong className="signal-chip" key={signal}>
                    {signal}
                  </strong>
                ))}
              </div>
            </div>

            <div className="concept-takeaway">
              <span>Student takeaway</span>
              <p>{module.studentTakeaway}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
