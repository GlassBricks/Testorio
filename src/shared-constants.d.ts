export const enum Remote {
  TestsAvailableFor = "testorio-tests-available-for-",
  RunTests = "testorio-run-tests",
  Testorio = "testorio",
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
  TestLoadError = "testorio.test-load-error",
  TestsCompleted = "testorio.tests-completed",
  RunNow = "testorio.run-now",
  ReloadAndRunTests = "testorio.reload-and-run-tests",

  TestProgressGuiTitle = "testorio.test-progress-gui-title",
  RunningTest = "testorio.running-test",
  Passed = "testorio.n-passed",
  Failed = "testorio.n-failed",
  Skipped = "testorio.n-skipped",
  Todo = "testorio.n-todo",
}

// test state that is persistent across game reload. Stored in global.settings
export const enum TestStage {
  NotRun = "NotRun",
  Running = "Running",
  ToReload = "ToReload",
  LoadError = "LoadError",
  Completed = "Completed",
}
