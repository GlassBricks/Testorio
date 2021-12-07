export const enum Remote {
  TestsAvailableFor = "testorio-tests-available-for-",
  RunTests = "testorio-run-tests",
  Testorio = "testorio",
}

export const enum Prototypes {
  EnablerTool = "testorio:enabler-tool",
  TestTubeSprite = "testorio:test-tube-sprite",
}

export namespace Locale {
  export const enum Testorio {
    Tests = "testorio.tests",
  }
  export const enum ConfigGui {
    Title = "testorio.config-gui.title",
    LoadTestsFor = "testorio.config-gui.load-tests-for",
    NoMod = "testorio.config-gui.none",
    OtherMod = "testorio.config-gui.other",
    ReloadMods = "testorio.config-gui.reload-mods",
    ModNotRegisteredTests = "testorio.config-gui.mod-not-registered",
    TestsNotRun = "testorio.config-gui.tests-not-run",
    TestsAlreadyStarted = "testorio.config-gui.tests-already-started",
    RunNow = "testorio.config-gui.run-now",
    ReloadAndRunTests = "testorio.config-gui.reload-and-run",
  }
  export const enum ProgressGui {
    Title = "testorio.progress-gui.title",
    RunningTest = "testorio.progress-gui.running-test",
    NPassed = "testorio.progress-gui.n-passed",
    NFailed = "testorio.progress-gui.n-failed",
    NSkipped = "testorio.progress-gui.n-skipped",
    NTodo = "testorio.progress-gui.n-todo",
    TestRunCompleted = "testorio.progress-gui.test-run-completed",
    Pass = "testorio.progress-gui.pass",
    Fail = "testorio.progress-gui.fail",
    PassWithTodo = "testorio.progress-gui.pass-with-todo",
    LoadError = "testorio.progress-gui.load-error",
  }
}

export const enum TestStage {
  NotRun = "NotRun",
  Running = "Running",
  ToReload = "ToReload",
  LoadError = "LoadError",
  Completed = "Completed",
}
