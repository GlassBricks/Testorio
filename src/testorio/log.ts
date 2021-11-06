import { Source } from "./tests"
import { TestListener } from "./testEvents"

export enum LogLevel {
  Trace = 1,
  Debug = 2,
  Info = 3,
  Warn = 4,
  Error = 5,
}

export enum LogColor {
  Lime = 1,
  Cyan = 2,
  White = 3,
  Yellow = 4,
  Red = 5,
}

export type LogHandler = (color: LogColor, message: string, source: Source | undefined) => void

const logHandlers: LogHandler[] = []

export function addLogHandlers(...handlers: LogHandler[]): void {
  logHandlers.push(...handlers)
}

export function doLog(level: LogLevel, message: string, color: LogColor = level as number, source?: Source): void {
  if (level < currentLevel) return
  color ??= level as number
  for (const logHandler of logHandlers) {
    logHandler(color, message, source)
  }
}

export const debugAdapterEnabled = script.active_mods.debugadapter !== undefined

let currentLevel: LogLevel = debugAdapterEnabled ? LogLevel.Debug : LogLevel.Info

export function setLogLevel(level: LogLevel): void {
  currentLevel = level
}

const json: typeof import("__debugadapter__/json") | undefined =
  debugAdapterEnabled && require("@NoResolution:__debugadapter__/json")

const categories = ["stdout", "stdout", "stdout", "console", "stderr"] as const

function logWithSource(color: LogColor, message: string, source: Source): void {
  let file = source?.file
  if (file && !file.startsWith("@")) file = "@" + file
  const body = {
    category: categories[color - 1],
    output: message,
    line: file && (source?.line ?? "1"),
    source: {
      name: file,
      path: file,
    },
  }
  _G.print("DBGprint: " + json!.encode(body))
}

export const debugAdapterLogger: LogHandler = (color, message, source) => {
  if (source) {
    logWithSource(color, message, source)
  } else {
    for (const line of message.split("\n")) {
      const [, , file, line1] = string.find(line, "(__[%a%-_]+__/.-%.%a+):([%d]*)")
      logWithSource(color, line, {
        file: file as string,
        line: tonumber(line1),
      })
    }
  }
}

export const logColors: readonly ColorArray[] = [
  [153, 204, 51],
  [173, 216, 230],
  [1, 1, 1],
  [255, 204, 50],
  [255, 100, 100],
]
export const gameLogger: LogHandler = (level, message) => {
  if (game) game.print(message, logColors[level - 1])
}

export const loggingListener: TestListener = (event, state) => {
  switch (event.type) {
    case "startTestRun": {
      doLog(LogLevel.Trace, "Test run started")
      break
    }
    case "enterDescribeBlock": {
      const { block } = event
      doLog(LogLevel.Trace, `BLOCK: ${block.name}`, undefined, block.source)
      break
    }
    case "testStarted": {
      const { test } = event
      doLog(LogLevel.Trace, `TEST:  ${test.path}`, undefined, test.source)
      break
    }
    case "testPassed": {
      doLog(LogLevel.Trace, `PASS`)
      break
    }
    case "testFailed": {
      doLog(LogLevel.Error, `Test failed: ` + event.test.path, LogColor.Yellow, event.test.source)
      for (const error of event.test.errors) {
        doLog(LogLevel.Error, error)
      }
      break
    }
    case "testSkipped": {
      const { test } = event
      doLog(LogLevel.Trace, "SKIPPED", undefined, test.source)
      break
    }
    case "testTodo": {
      const { test } = event
      doLog(LogLevel.Warn, "TODO: " + event.test.path, undefined, test.source)
      break
    }
    case "exitDescribeBlock": {
      const { block } = event
      doLog(LogLevel.Trace, `END BLOCK: ${block.name}`, undefined, block.source)
      break
    }
    case "finishTestRun": {
      const result = state.results
      if (result.suppressedErrors.length > 0) {
        doLog(LogLevel.Error, "There are additional errors:", LogColor.Yellow)
        for (const error of result.suppressedErrors) {
          doLog(LogLevel.Error, error)
        }
      }
      const color =
        result.status === "passed" ? LogColor.Lime : result.status === "todo" ? LogColor.Yellow : LogColor.Red
      doLog(
        LogLevel.Error,
        "Test run result: " +
          (result.status === "passed" ? "PASS" : result.status === "todo" ? "PASS with todo" : "FAIL"),
        color,
      )
      break
    }
    case "loadError": {
      const result = state.results
      doLog(LogLevel.Error, "Load error:")
      doLog(LogLevel.Error, result.suppressedErrors[0])
      break
    }
  }
}
