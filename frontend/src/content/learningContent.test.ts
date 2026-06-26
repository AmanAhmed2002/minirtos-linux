import { describe, expect, it } from "vitest";
import {
  getScenarioLearningContent,
  scenarioLearningContent,
  type ConceptModule,
} from "./learningContent";
import type { ScenarioResponse } from "../types/api";

// The nine scenario IDs served by the backend ScenarioService allowlist.
const SCENARIO_IDS = [
  "normal",
  "priority_scheduler",
  "deadline_scheduler",
  "queue_overflow",
  "dropped_messages",
  "slow_task",
  "cpu_spike",
  "task_crash",
  "watchdog_slow_task",
] as const;

// Real telemetry event_type values emitted by the C++ runtime (Logger.cpp)...
const VALID_EVENT_SIGNALS = new Set([
  "runtime_started",
  "scheduler_started",
  "task_started",
  "task_completed",
  "message_sent",
  "message_received",
  "message_dropped",
  "fault_injected",
  "task_failed",
  "task_skipped",
  "watchdog_timeout",
  "task_recovered",
  "scheduler_finished",
  "runtime_summary",
  "runtime_finished",
]);

// ...and real camelCase fields exposed by the analyzer/API DTOs (types/api.ts).
const VALID_FIELD_SIGNALS = new Set([
  "runtimeHealth",
  "eventsLoaded",
  "simulationName",
  "schedulerMode",
  "configuredDurationSeconds",
  "observedDurationMs",
  "eventCounts",
  "severityCounts",
  "taskMetrics",
  "messageSummary",
  "rootCauses",
  "rawReport",
  "runs",
  "deadlineMisses",
  "deadlineMissedEvents",
  "avgDurationMs",
  "maxDurationMs",
  "sent",
  "received",
  "dropped",
  "queueFullDrops",
  "faultInjectedDrops",
]);

const isValidSignal = (signal: string): boolean =>
  VALID_EVENT_SIGNALS.has(signal) || VALID_FIELD_SIGNALS.has(signal);

const nonEmpty = (value: string): boolean =>
  typeof value === "string" && value.trim().length > 0;

const titles = (modules: ConceptModule[]): string[] =>
  modules.map((module) => module.title);

const hasTitleMatching = (modules: ConceptModule[], pattern: RegExp): boolean =>
  modules.some((module) => pattern.test(module.title));

describe("learning content coverage", () => {
  it("provides explicit content for every backend scenario ID", () => {
    for (const id of SCENARIO_IDS) {
      expect(scenarioLearningContent[id], `missing content for ${id}`).toBeDefined();
    }
  });

  it.each(SCENARIO_IDS)("scenario '%s' has a non-empty headline and modules", (id) => {
    const content = scenarioLearningContent[id];
    expect(nonEmpty(content.headline)).toBe(true);
    expect(content.conceptModules.length).toBeGreaterThan(0);
  });

  it.each(SCENARIO_IDS)("scenario '%s' has fully populated module fields", (id) => {
    for (const module of scenarioLearningContent[id].conceptModules) {
      expect(nonEmpty(module.title), `${id}: empty title`).toBe(true);
      expect(nonEmpty(module.summary), `${id}/${module.title}: empty summary`).toBe(true);
      expect(nonEmpty(module.whyItMatters), `${id}/${module.title}: empty whyItMatters`).toBe(true);
      expect(nonEmpty(module.studentTakeaway), `${id}/${module.title}: empty takeaway`).toBe(true);
      expect(module.signalsToWatch.length, `${id}/${module.title}: no signals`).toBeGreaterThan(0);
      expect(module.signalsToWatch.every(nonEmpty)).toBe(true);
    }
  });

  it.each(SCENARIO_IDS)("scenario '%s' has unique module titles (React keys)", (id) => {
    const moduleTitles = titles(scenarioLearningContent[id].conceptModules);
    expect(new Set(moduleTitles).size).toBe(moduleTitles.length);
  });

  it.each(SCENARIO_IDS)(
    "scenario '%s' covers prerequisite, worked example, prediction, observation, and comprehension",
    (id) => {
      const modules = scenarioLearningContent[id].conceptModules;
      expect(hasTitleMatching(modules, /prerequisite/i), `${id}: no prerequisite card`).toBe(true);
      expect(hasTitleMatching(modules, /worked example/i), `${id}: no worked-example card`).toBe(true);
      expect(hasTitleMatching(modules, /predict/i), `${id}: no prediction card`).toBe(true);
      expect(hasTitleMatching(modules, /read the results/i), `${id}: no observation card`).toBe(true);
      expect(
        hasTitleMatching(modules, /check your understanding/i),
        `${id}: no comprehension card`
      ).toBe(true);
    }
  );

  it("only references real telemetry events or analyzer/API fields as signals", () => {
    for (const id of SCENARIO_IDS) {
      for (const module of scenarioLearningContent[id].conceptModules) {
        for (const signal of module.signalsToWatch) {
          expect(isValidSignal(signal), `${id}/${module.title}: unknown signal '${signal}'`).toBe(true);
        }
      }
    }
  });

  it("never advertises a standalone deadline_missed event in any signal list", () => {
    // Deadline misses are surfaced via deadlineMisses/deadlineMissedEvents fields
    // and the deadline_missed boolean on task_completed, never as their own event.
    for (const id of SCENARIO_IDS) {
      for (const module of scenarioLearningContent[id].conceptModules) {
        expect(module.signalsToWatch).not.toContain("deadline_missed");
      }
    }
  });

  it("does not claim check_interval_ms controls watchdog timing", () => {
    // The watchdog inspects a task after each of its executions (Scheduler.cpp);
    // check_interval_ms is parsed/validated but never drives timeout timing, so
    // the lesson must not reference it.
    const watchdogText = scenarioLearningContent.watchdog_slow_task.conceptModules
      .flatMap((module) => [
        module.title,
        module.summary,
        module.whyItMatters,
        module.studentTakeaway,
      ])
      .join(" ");

    expect(watchdogText).not.toMatch(/check_interval/i);
  });

  it("falls back to default content for unknown or null scenarios", () => {
    expect(getScenarioLearningContent(null).conceptModules.length).toBeGreaterThan(0);

    const unknown = { id: "does_not_exist" } as ScenarioResponse;
    const fallback = getScenarioLearningContent(unknown);
    expect(fallback).toBe(getScenarioLearningContent(null));
  });
});
