import { useNavigate } from "react-router-dom";
import { lessonCatalog } from "../data/lessonCatalog";
import { LessonCard } from "../components/LessonCard";
import { useMiniRtosData } from "../context/miniRtosData";

export function LearnPage() {
  const navigate = useNavigate();
  const { runScenario, isRunning } = useMiniRtosData();

  async function handleRunScenario(scenarioId: string) {
    const run = await runScenario(scenarioId);
    if (run) {
      navigate("/analysis");
    }
  }

  return (
    <div className="learn-page">
      <section className="page-header">
        <p className="eyebrow">Learn</p>
        <h1>The MiniRTOS learning path</h1>
        <p className="page-header__subtitle">
          Work through the modules in order. Each one explains a concept in
          plain English, then connects to a simulation you can run and inspect.
        </p>
      </section>

      <div className="lesson-grid">
        {lessonCatalog.map((lesson) => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            onRunScenario={handleRunScenario}
            isRunning={isRunning}
          />
        ))}
      </div>
    </div>
  );
}
