export const enum Settings {
  LoadTestsFor = "testorio:test-mod",
  ReloadState = "testorio:reload-state",
}

export const enum Prototypes {
  EnablerTool = "testorio:enabler-tool",
}

// test state that is persistent across game reload. Stored in global.settings
export const enum ReloadState {
  Uninitialized = "Uninitialized",
  Loaded = "Loaded",
  Running = "Running",
  ToReload = "ToReload",
  LoadError = "LoadError",
  Completed = "Completed",
}

export const ReloadStateValues: ReloadState[] = [
  ReloadState.Uninitialized,
  ReloadState.Loaded,
  ReloadState.Running,
  ReloadState.ToReload,
  ReloadState.LoadError,
  ReloadState.Completed,
]

export namespace Colors {
  export const red: Color = { r: 244, g: 85, b: 85 }
  export const green: Color = { r: 155, g: 244, b: 122 }
  export const yellow: Color = { r: 255, g: 204, b: 20 }
}
