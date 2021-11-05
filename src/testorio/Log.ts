import { Source } from "./tests"

const debugAdapterEnabled = script.active_mods.debugadapter

const modNameHack = "__debugadapter__/json"
const json: typeof import("__debugadapter__/json") | undefined = debugAdapterEnabled && require(modNameHack)

export enum LogLevel {
  Trace = 1,
  Debug,
  Info,
  Warn,
  Error,
  None,
}

const colors: readonly Color[] = [
  [153, 204, 51],
  [173, 216, 230],
  [1, 1, 1],
  [255, 204, 50],
  [255, 100, 100],
]
const categories = ["stdout", "stdout", "stdout", "console", "stderr"] as const

let currentLevel: LogLevel = debugAdapterEnabled ? LogLevel.Debug : LogLevel.Info

export function getLevel(): LogLevel {
  return currentLevel
}

export function setLevel(level: LogLevel): void {
  currentLevel = level
}

export function logWithSource(level: LogLevel, message: string, source: Source): void {
  if (level < currentLevel) return
  if (!debugAdapterEnabled) {
    _G.log(message)
  } else {
    let file = source?.file
    if (file && !file.startsWith("@")) file = "@" + file
    const body = {
      category: categories[level - 1],
      output: message,
      line: file && (source?.line ?? "1"),
      source: {
        name: file,
        path: file,
      },
    }
    _G.print("DBGprint: " + json!.encode(body))
  }
  if (game) {
    game.print(message, colors[level - 1])
  }
}

export function logDetectSource(level: LogLevel, message: string): void {
  if (level < currentLevel) return
  const [, , file, line] = string.find(message, "(__[%a%-_]+__/.-%.%a+):([%d]*)")
  logWithSource(level, message, {
    file: file as string,
    line: tonumber(line),
  })
}

export function log(level: LogLevel, message: string): void {
  // __DebugAdapter.print("", undefined, 1, "stderr", true)
  if (level < currentLevel) return
  for (const line of message.split("\n")) {
    logDetectSource(level, line)
  }
}
