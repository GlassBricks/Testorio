export const enum Remote {
  TestsAvailableFor = "testorio-tests-available-for-",
  Testorio = "testorio",
}

export const enum Prototypes {
  EnablerTool = "testorio:enabler-tool",
  TestTubeSprite = "testorio:test-tube-sprite",
  TestOutputBoxStyle = "testorio:test-output-box-style",
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
    TestsRunning = "testorio.config-gui.tests-running",
    TestsFinished = "testorio.config-gui.tests-finished",
    TestsLoadError = "testorio.config-gui.tests-load-error",
    RunTests = "testorio.config-gui.run-tests",
  }
  export const enum ProgressGui {
    Title = "testorio.progress-gui.title",
    TitleRerun = "testorio.progress-gui.title-rerun",
    RunningTest = "testorio.progress-gui.running-test",
    NPassed = "testorio.progress-gui.n-passed",
    NFailed = "testorio.progress-gui.n-failed",
    NErrors = "testorio.progress-gui.n-errors",
    NSkipped = "testorio.progress-gui.n-skipped",
    NTodo = "testorio.progress-gui.n-todo",
    TestsFinished = "testorio.progress-gui.tests-finished",
    TestsFinishedRerun = "testorio.progress-gui.tests-finished-rerun",
    LoadError = "testorio.progress-gui.load-error",
  }
}

export const enum TestStage {
  NotRun = "NotRun",
  Running = "Running",
  ToReload = "ToReload",
  LoadError = "LoadError",
  Finished = "Finished",
}

export const enum Misc {
  CloseProgressGui = "close-progress-gui",
  TestProgressGui = "testorio:test-progress",
}
