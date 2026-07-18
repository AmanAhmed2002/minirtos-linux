import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "./App";
import {
  analysisFixture,
  completedRunFixture,
  scenarioFixtures,
} from "./test/testData";
import {
  createRun,
  getRunLog,
  getRunAnalysis,
  getRuns,
  getScenarios,
} from "./api/minirtosApi";

vi.mock("./api/minirtosApi", () => ({
  createRun: vi.fn(),
  getRunLog: vi.fn(),
  getRunAnalysis: vi.fn(),
  getRuns: vi.fn(),
  getScenarios: vi.fn(),
}));

const mockGetScenarios = vi.mocked(getScenarios);
const mockGetRuns = vi.mocked(getRuns);
const mockCreateRun = vi.mocked(createRun);
const mockGetRunLog = vi.mocked(getRunLog);
const mockGetRunAnalysis = vi.mocked(getRunAnalysis);

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>
  );
}

describe("App routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetScenarios.mockResolvedValue(scenarioFixtures);
    mockGetRuns.mockResolvedValue([completedRunFixture]);
    mockGetRunAnalysis.mockResolvedValue(analysisFixture);
    mockCreateRun.mockResolvedValue(completedRunFixture);
    mockGetRunLog.mockResolvedValue({
      runId: completedRunFixture.runId,
      logPath: completedRunFixture.logPath ?? "",
      content:
        '{"event_type":"runtime_started","scenario_id":"queue_overflow"}\n{"event_type":"message_dropped"}',
    });
  });

  it("renders a learning-first homepage with both CTAs", () => {
    renderAt("/");

    expect(
      screen.getByRole("heading", { level: 1, name: "MiniRTOS Playground" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start Learning" })).toHaveAttribute(
      "href",
      "/learn"
    );
    expect(screen.getByRole("link", { name: "Run Simulator" })).toHaveAttribute(
      "href",
      "/simulator"
    );
  });

  it("lists the module path on the Learn page", () => {
    renderAt("/learn");

    expect(
      screen.getByRole("heading", { name: "The MiniRTOS learning path" })
    ).toBeInTheDocument();
    expect(screen.getByText("What is an embedded system?")).toBeInTheDocument();
    expect(screen.getAllByText("Open Lesson").length).toBeGreaterThan(0);
  });

  it("shows lesson detail with concept, analogy, and run button", () => {
    renderAt("/learn/queues-and-message-passing");

    expect(
      screen.getByRole("heading", { level: 1, name: "Queues and message passing" })
    ).toBeInTheDocument();
    expect(screen.getByText("Beginner analogy")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Run matching scenario" })
    ).toBeInTheDocument();
  });

  it("renders scenario concept cards on the Simulator page", async () => {
    renderAt("/simulator");

    expect(
      await screen.findByRole("heading", { name: "RTOS Simulator" })
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { level: 3, name: "Queue Overflow" })
    ).toBeInTheDocument();
    expect(screen.getByText(/New here\?/)).toBeInTheDocument();
  });

  it("runs a scenario from the Simulator and creates a run", async () => {
    const user = userEvent.setup();
    renderAt("/simulator");

    const heading = await screen.findByRole("heading", {
      level: 3,
      name: "Queue Overflow",
    });
    const card = heading.closest("article");
    expect(card).not.toBeNull();

    await user.click(
      within(card as HTMLElement).getByRole("button", { name: "Run scenario" })
    );

    await waitFor(() =>
      expect(mockCreateRun).toHaveBeenCalledWith("queue_overflow")
    );
  });

  it("explains a completed run on the Analysis page", async () => {
    renderAt("/analysis");

    expect(
      await screen.findByRole("heading", { name: "What this run means" })
    ).toBeInTheDocument();
    expect(screen.getByText("Plain-English summary")).toBeInTheDocument();
    expect(
      screen.getAllByText(/dropped messages/i).length
    ).toBeGreaterThan(0);
  });

  it("embeds the MiniRTOS Looker Studio dashboard", () => {
    renderAt("/looker");

    expect(
      screen.getByRole("heading", { name: "Explore MiniRTOS telemetry" })
    ).toBeInTheDocument();
    expect(
      screen.getByTitle("MiniRTOS Looker Studio analytics dashboard")
    ).toHaveAttribute(
      "src",
      "https://lookerstudio.google.com/embed/reporting/2abc4f30-bfdf-4628-b5b0-4f1482ccb5e4"
    );
    expect(
      screen.getByRole("link", { name: /Open in Looker Studio/i })
    ).toHaveAttribute(
      "href",
      "https://lookerstudio.google.com/reporting/2abc4f30-bfdf-4628-b5b0-4f1482ccb5e4"
    );
  });

  it("shows a beginner summary tab and a raw logs tab on the Runs page", async () => {
    const user = userEvent.setup();
    renderAt("/runs");

    expect(
      await screen.findByRole("tab", { name: "Beginner Summary" })
    ).toBeInTheDocument();
    expect(screen.getByText("Concept tested")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Raw Logs" }));
    expect(await screen.findByText(/runtime_started/)).toBeInTheDocument();
    expect(mockGetRunLog).toHaveBeenCalledWith(completedRunFixture.runId);
  });

  it("surfaces a load error on the Simulator page", async () => {
    mockGetScenarios.mockRejectedValue(new Error("Backend unavailable"));
    renderAt("/simulator");

    expect(await screen.findByText(/Simulator error:/i)).toBeInTheDocument();
    expect(screen.getByText("Backend unavailable")).toBeInTheDocument();
  });
});
