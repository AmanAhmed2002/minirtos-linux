import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ScenarioSelector } from "./ScenarioSelector";
import { scenarioFixtures } from "../test/testData";

describe("ScenarioSelector", () => {
  it("renders scenario metadata and calls handlers", async () => {
    const user = userEvent.setup();
    const onSelectScenario = vi.fn();
    const onRunScenario = vi.fn();

    render(
      <ScenarioSelector
        scenarios={scenarioFixtures}
        selectedScenarioId="queue_overflow"
        isRunning={false}
        onSelectScenario={onSelectScenario}
        onRunScenario={onRunScenario}
      />
    );

    expect(screen.getByLabelText("Scenario")).toHaveValue("queue_overflow");
    expect(screen.getByText("Bounded queues")).toBeInTheDocument();
    expect(screen.getByText("Queue-full drops")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Scenario"), "cpu_spike");
    expect(onSelectScenario).toHaveBeenCalledWith("cpu_spike");

    await user.click(screen.getByRole("button", { name: "Run selected scenario" }));
    expect(onRunScenario).toHaveBeenCalledTimes(1);
  });

  it("disables controls while a run is in progress", () => {
    render(
      <ScenarioSelector
        scenarios={scenarioFixtures}
        selectedScenarioId="queue_overflow"
        isRunning={true}
        onSelectScenario={vi.fn()}
        onRunScenario={vi.fn()}
      />
    );

    expect(screen.getByLabelText("Scenario")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Running simulation..." })).toBeDisabled();
  });
});
