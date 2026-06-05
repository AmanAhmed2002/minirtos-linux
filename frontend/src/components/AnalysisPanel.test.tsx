import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnalysisPanel } from "./AnalysisPanel";
import { analysisFixture } from "../test/testData";

describe("AnalysisPanel", () => {
  it("renders the loading state", () => {
    render(<AnalysisPanel analysis={null} isLoading={true} />);

    expect(screen.getByRole("heading", { name: "Loading analysis..." })).toBeInTheDocument();
  });

  it("renders the empty state when no analysis is selected", () => {
    render(<AnalysisPanel analysis={null} isLoading={false} />);

    expect(screen.getByRole("heading", { name: "No analysis selected" })).toBeInTheDocument();
  });

  it("renders analyzer summary, visualizers, task metrics, root causes, and raw report", () => {
    render(<AnalysisPanel analysis={analysisFixture} isLoading={false} />);

    expect(screen.getByRole("heading", { name: "queue_overflow" })).toBeInTheDocument();
    expect(screen.getByText("3064")).toBeInTheDocument();
    expect(screen.getByText("round_robin")).toBeInTheDocument();

    // Values such as 956, ControlTask, NetworkTask, and root-cause labels can
    // appear in multiple places: summary cards, visualizers, task table, and raw report.
    expect(screen.getAllByText("956").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ControlTask").length).toBeGreaterThan(0);
    expect(screen.getAllByText("NetworkTask").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Queue pressure detected").length).toBeGreaterThan(0);

    const table = screen.getByRole("table");
    expect(within(table).getByText("ControlTask")).toBeInTheDocument();
    expect(within(table).getByText("NetworkTask")).toBeInTheDocument();

    expect(screen.getByText("Raw analyzer report")).toBeInTheDocument();
  });
});
