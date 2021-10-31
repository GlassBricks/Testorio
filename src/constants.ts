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
  TestConfig = "testorio.test-configuration",
  LoadTestsFor = "testorio.load-tests-for",
  NoMod = "testorio.no-mod",
  OtherMod = "testorio.other-mod",
  TestsNotRun = "testorio.tests-not-run",
  TestsRunning = "testorio.tests-running",
  TestsCompleted = "testorio.tests-completed",
  RunTests = "testorio.run-tests",
  TestConsole = "testorio.test-console",
}

const path = "__testorio__/graphics/"

export const Graphics = {
  EnablerTool: path + "enabler-tool.png",
  EnablerToolButton: path + "enabler-tool-button.png",
  TestTube: path + "test-tube.png",
} as const

export namespace Colors {
  export const red: Color = { r: 255, g: 40, b: 40 }
  export const green: Color = { r: 155, g: 255, b: 122 }
  export const yellow: Color = { r: 255, g: 204, b: 20 }
  export const purple: Color = { r: 240, g: 20, b: 220 }
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
