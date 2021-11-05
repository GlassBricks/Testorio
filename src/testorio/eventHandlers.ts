import * as Log from "./Log"
import { LogLevel } from "./Log"
import { TestEvent } from "./testEvents"

export function loggingHandler(event: TestEvent): void {
  switch (event.type) {
    case "startTestRun": {
      Log.log(LogLevel.Trace, "Test run started")
      break
    }
    case "enterDescribeBlock": {
      const { block } = event
      Log.logWithSource(LogLevel.Trace, `BLOCK: ${block.name}`, block.source)
      break
    }
    case "testStarted": {
      const { test } = event
      Log.logWithSource(LogLevel.Debug, `TEST:  ${test.path}`, test.source)
      break
    }
    case "testPassed": {
      Log.log(LogLevel.Trace, `PASS`)
      break
    }
    case "testFailed": {
      Log.log(LogLevel.Debug, `FAIL`)
      break
    }
    case "testSkipped": {
      const { test } = event
      Log.logWithSource(LogLevel.Debug, "SKIPPED", test.source)
      break
    }
    case "testTodo": {
      const { test } = event
      Log.logWithSource(LogLevel.Debug, "TODO", test.source)
      break
    }
    case "exitDescribeBlock": {
      const { block } = event
      Log.logWithSource(LogLevel.Trace, `END BLOCK: ${block.name}`, block.source)
      break
    }
    case "finishTestRun": {
      Log.log(LogLevel.Trace, "Test run finished")
      break
    }
  }
}

export function setupHandler(event: TestEvent): void {
  if (event.type === "startTestRun") {
    game.speed = 1000
    game.autosave_enabled = false
  } else if (event.type === "finishTestRun") {
    game.speed = 1
  }
}
