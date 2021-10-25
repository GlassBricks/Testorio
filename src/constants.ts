export enum ProtoNames {
  LoadTestsFor = "testorio:test-mod",
  AutoRunMode = "testorio:autorun-mode",
  ReloadState = "testorio:reload-state",
  EnablerTool = "testorio:enabler-tool",
}

// test state that is persistent across game reload. Stored in global.settings
export enum ReloadState {
  Uninitialized = "Uninitialized",
  Loaded = "Loaded",
  Running = "Running",
  ToReload = "ToReload",
  LoadError = "LoadError",
  Completed = "Completed",
}

export namespace Colors {
  export const red: Color = { r: 244, g: 85, b: 85 }
  export const green: Color = { r: 155, g: 244, b: 122 }
  export const yellow: Color = { r: 255, g: 204, b: 20 }
}
