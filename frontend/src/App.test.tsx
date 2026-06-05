import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import {
  analysisFixture,
  completedRunFixture,
  scenarioFixtures,
} from "./test/testData";
import {
  createRun,
  getRunAnalysis,
  getRuns,
  getScenarios,
} from "./api/minirtosApi";

vi.mock("./api/minirtosApi", () => ({
  createRun: vi.fn(),
  getRunAnalysis: vi.fn(),
  getRuns: vi.fn(),
  getScenarios: vi.fn(),
}));

const mockGetScenarios = vi.mocked(getScenarios);
const mockGetRuns = vi.mocked(getRuns);
const mockCreateRun = vi.mocked(createRun);
const mockGetRunAnalysis = vi.mocked(getRunAnalysis);

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetScenarios.mockResolvedValue(scenarioFixtures);
    mockGetRuns.mockResolvedValue([completedRunFixture]);
    mockGetRunAnalysis.mockResolvedValue(analysisFixture);
    mockCreateRun.mockResolvedValue(completedRunFixture);
  });

  it("loads scenarios, persisted runs, guided learning, and selected run analysis", async () => {
    render(<App />);

    expect(screen.getByText("Loading MiniRTOS Playground...")).toBeInTheDocument();

    expect(await screen.findByRole("heading", { name: "Choose a simulation" })).toBeInTheDocument();
    expect(screen.getByLabelText("Scenario")).toHaveValue("queue_overflow");
    expect(screen.getAllByText("Queue Overflow").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Queue pressure").length).toBeGreaterThan(0);
    expect(screen.getByText(completedRunFixture.runId)).toBeInTheDocument();

    expect(await screen.findByRole("heading", { name: "queue_overflow" })).toBeInTheDocument();
    expect(screen.getAllByText("Queue pressure detected").length).toBeGreaterThan(0);
    expect(mockGetScenarios).toHaveBeenCalledTimes(1);
    expect(mockGetRuns).toHaveBeenCalledTimes(1);
    expect(mockGetRunAnalysis).toHaveBeenCalledWith(completedRunFixture.runId);
  });

  it("creates a run for the selected scenario and refreshes persisted history", async () => {
    const user = userEvent.setup();
    const refreshedRun = {
      ...completedRunFixture,
      runId: "new-run-id",
    };

    mockCreateRun.mockResolvedValue(refreshedRun);
    mockGetRuns
      .mockResolvedValueOnce([completedRunFixture])
      .mockResolvedValueOnce([refreshedRun, completedRunFixture]);
    mockGetRunAnalysis.mockResolvedValue({
      ...analysisFixture,
      runId: refreshedRun.runId,
    });

    render(<App />);

    await screen.findByRole("heading", { name: "Choose a simulation" });
    await user.selectOptions(screen.getByLabelText("Scenario"), "cpu_spike");
    await user.click(screen.getByRole("button", { name: "Run selected scenario" }));

    await waitFor(() => expect(mockCreateRun).toHaveBeenCalledWith("cpu_spike"));
    await waitFor(() => expect(screen.getByText("new-run-id")).toBeInTheDocument());
    expect(mockGetRuns).toHaveBeenCalledTimes(2);
  });

  it("shows a dashboard error when the initial API load fails", async () => {
    mockGetScenarios.mockRejectedValue(new Error("Backend unavailable"));

    render(<App />);

    const banner = await screen.findByText(/Dashboard error:/i);
    expect(banner).toBeInTheDocument();
    expect(screen.getByText("Backend unavailable")).toBeInTheDocument();
  });

  it("shows a failed-run error box when a failed run is selected", async () => {
    const user = userEvent.setup();
    const failedRun = {
      ...completedRunFixture,
      runId: "failed-run",
      scenarioName: "Task Crash",
      status: "FAILED" as const,
      errorMessage: "Runtime process failed.",
    };

    mockGetRuns.mockResolvedValue([completedRunFixture, failedRun]);

    render(<App />);

    const historyPanel = await screen.findByRole("heading", { name: "Previous runs" });
    const panel = historyPanel.closest("section");
    expect(panel).not.toBeNull();

    await user.click(within(panel as HTMLElement).getByRole("button", { name: /Task Crash/i }));

    expect(screen.getByText(/Selected run failed:/i)).toBeInTheDocument();
    expect(screen.getAllByText("Runtime process failed.").length).toBeGreaterThan(0);
  });
});
