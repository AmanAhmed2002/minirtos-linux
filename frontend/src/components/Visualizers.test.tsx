import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FaultExplanationPanel } from "./FaultExplanationPanel";
import { LearningModulePanel } from "./LearningModulePanel";
import { QueuePressureChart } from "./QueuePressureChart";
import { RunHistory } from "./RunHistory";
import { RunResultCard } from "./RunResultCard";
import { TaskTimeline } from "./TaskTimeline";
import {
  analysisFixture,
  completedRunFixture,
  scenarioFixtures,
} from "../test/testData";

describe("Phase 29/31 dashboard components", () => {
  it("renders queue pressure values and drop breakdown", () => {
    render(<QueuePressureChart messageSummary={analysisFixture.messageSummary} />);

    expect(screen.getByRole("heading", { name: "Queue pressure" })).toBeInTheDocument();
    expect(screen.getByText("Received")).toBeInTheDocument();
    expect(screen.getByText("Dropped")).toBeInTheDocument();
    expect(screen.getByText("Queue-full share of drops")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("renders queue pressure empty state", () => {
    render(<QueuePressureChart messageSummary={null} />);

    expect(screen.getByText("No message summary was parsed for this run.")).toBeInTheDocument();
  });

  it("renders task timeline rows and deadline-risk text", () => {
    render(<TaskTimeline taskMetrics={analysisFixture.taskMetrics} />);

    expect(screen.getByRole("heading", { name: "Task runtime timeline" })).toBeInTheDocument();
    expect(screen.getByText("ControlTask")).toBeInTheDocument();
    expect(screen.getByText("NetworkTask")).toBeInTheDocument();
    expect(screen.getByText("30 runs · 2 misses")).toBeInTheDocument();
  });

  it("renders learning content for the selected scenario", () => {
    render(<LearningModulePanel scenario={scenarioFixtures[0]} />);

    expect(screen.getByRole("heading", { name: "What this scenario teaches" })).toBeInTheDocument();
    expect(screen.getAllByText("Queue pressure").length).toBeGreaterThan(0);
    expect(screen.getByText("Warning health state")).toBeInTheDocument();
  });

  it("renders fault and health explanations", () => {
    render(<FaultExplanationPanel analysis={analysisFixture} />);

    expect(screen.getByRole("heading", { name: "Fault and health explanation" })).toBeInTheDocument();
    expect(screen.getAllByText("WARNING").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Queue pressure detected").length).toBeGreaterThan(0);
  });

  it("renders run result card details", () => {
    render(<RunResultCard run={completedRunFixture} />);

    expect(screen.getByRole("heading", { name: "Queue Overflow" })).toBeInTheDocument();
    expect(screen.getByText("COMPLETED")).toBeInTheDocument();
    expect(screen.getAllByText("WARNING").length).toBeGreaterThan(0);
    expect(screen.getByText(completedRunFixture.logPath ?? "")).toBeInTheDocument();
  });

  it("renders run history empty and populated states", () => {
    const { rerender } = render(
      <RunHistory runs={[]} selectedRunId={null} onSelectRun={() => undefined} />
    );

    expect(screen.getByText(/No persisted runs yet/i)).toBeInTheDocument();

    rerender(
      <RunHistory
        runs={[completedRunFixture]}
        selectedRunId={completedRunFixture.runId}
        onSelectRun={() => undefined}
      />
    );

    expect(screen.getByText(completedRunFixture.runId)).toBeInTheDocument();
    const historyPanel = screen.getByRole("heading", { name: "Previous runs" }).closest("section");
    expect(historyPanel).not.toBeNull();
    expect(within(historyPanel as HTMLElement).getByText("1")).toBeInTheDocument();
  });
});
