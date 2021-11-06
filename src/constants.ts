export const enum Settings {
  TestMod = "testorio:test-mod",
  TestStage = "testorio:test-stage",
}

export const enum Remote {
  TestsAvailableFor = "testorio-tests-available-for-",
  RunTests = "testorio-run-tests",
  TestEvents = "testorio-test-event",
}

export const enum Prototypes {
  EnablerTool = "testorio:enabler-tool",
  TestTubeSprite = "testorio:test-tube-sprite",
}

export const enum Locale {
  Tests = "testorio.tests",
  TestConfigTitle = "testorio.test-config-title",
  LoadTestsFor = "testorio.load-tests-for",
  NoMod = "testorio.no-mod",
  OtherMod = "testorio.other-mod",
  ReloadMods = "testorio.reload-mods",
  ModNotRegisteredTests = "testorio.mod-not-registered-tests",
  ModNotLoadedTests = "testorio.mod-not-loaded-tests",
  TestsNotRun = "testorio.tests-not-run",
  TestsRunning = "testorio.tests-running",
  TestsCompleted = "testorio.tests-completed",
  LoadError = "testorio.load-error",
  RunNow = "testorio.run-now",
  ReloadAndRunTests = "testorio.reload-and-run-tests",

  TestProgressGuiTitle = "testorio.test-progress-gui-title",
  RunningTest = "testorio.running-test",
  Passed = "testorio.n-passed",
  Failed = "testorio.n-failed",
  Skipped = "testorio.n-skipped",
  Todo = "testorio.n-todo",
}

const path = "__testorio__/graphics/"

export const Graphics = {
  EnablerTool: path + "enabler-tool.png",
  EnablerToolButton: path + "enabler-tool-button.png",
  TestTube: path + "test-tube.png",
} as const

export namespace Colors {
  export const Red: Color = { r: 255, g: 40, b: 40 }
  export const Green: Color = { r: 155, g: 255, b: 122 }
  export const Yellow: Color = { r: 255, g: 204, b: 20 }
  export const Purple: Color = { r: 240, g: 20, b: 220 }
}

// test state that is persistent across game reload. Stored in global.settings
export const enum TestStage {
  NotRun = "NotRun",
  Running = "Running",
  ToReload = "ToReload",
  LoadError = "LoadError",
  Completed = "Completed",
}

export const TestStageValues: TestStage[] = [
  TestStage.NotRun,
  TestStage.Running,
  TestStage.ToReload,
  TestStage.LoadError,
  TestStage.Completed,
]
