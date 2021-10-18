import * as Log from "./Log"
import { LogLevel } from "./Log"
import { TestState } from "./setup"
import { DescribeBlock, Test } from "./tests"
import { assertNever } from "../util"

interface TestResult {
  test: Test
}

function collectTestResults(
  block: DescribeBlock,
  results: TestResult[],
): TestResult[] {
  for (const child of block.children) {
    if (child.type === "describeBlock") {
      collectTestResults(child, results)
    } else {
      results.push({
        test: child,
      })
    }
  }

  return results
}

interface RunResult {
  tests: number

  ran: number

  passed: number
  failed: number
  skipped: number
  todo: number

  testResults: TestResult[]
  suppressedErrors: string[]

  hasFocusedTests: boolean

  status: "passed" | "failed" | "todo"
}

function makeRunResult(testState: TestState): RunResult {
  const testResults = collectTestResults(testState.rootBlock, [])
  const result: RunResult = {
    tests: 0,
    ran: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    todo: 0,
    testResults,
    status: undefined!,
    suppressedErrors: testState.suppressedErrors,
    hasFocusedTests: testState.hasFocusedTests,
  }
  for (const { test } of testResults) {
    result.tests++
    if (test.result === "passed") {
      result.ran++
      result.passed++
    } else if (test.result === "failed") {
      result.ran++
      result.failed++
    } else if (test.result === "skipped") {
      result.skipped++
    } else if (test.result === "todo") {
      result.todo++
    } else if (!test.result) {
      Log.log(LogLevel.Error, `${test.path} has no result`)
    } else {
      assertNever(test.result)
    }
  }
  if (result.failed !== 0 || result.suppressedErrors.length !== 0) {
    result.status = "failed"
  } else if (result.todo !== 0) {
    result.status = "todo"
  } else {
    result.status = "passed"
  }

  return result
}

export default function reportRunResult(testState: TestState): void {
  const result = makeRunResult(testState)
  const oldLevel = Log.getLevel()
  Log.setLevel(LogLevel.Trace)
  Log.log(
    result.status === "passed"
      ? LogLevel.Trace
      : result.status === "todo"
      ? LogLevel.Warn
      : LogLevel.Error,

    "Test run result: " +
      (result.status === "passed"
        ? "PASS"
        : result.status === "todo"
        ? "PASS with todo"
        : "FAIL"),
  )
  Log.log(LogLevel.Info, `${result.passed}/${result.ran} tests passed`)
  if (result.skipped !== 0) {
    Log.log(LogLevel.Info, `${result.skipped} skipped`)
  }
  if (result.todo !== 0) {
    Log.log(LogLevel.Info, `${result.todo} todo`)
  }
  Log.log(LogLevel.Info, `${result.tests} tests total`)
  if (result.hasFocusedTests) {
    Log.log(LogLevel.Info, "Tests ran in focused mode")
  }

  for (const { test } of result.testResults) {
    if (test.result !== "failed") continue
    Log.logWithSource(LogLevel.Warn, `${test.path}:`, test.source)
    for (const error of test.errors) {
      Log.log(LogLevel.Error, error)
    }
  }
  if (result.todo !== 0) {
    Log.log(LogLevel.Warn, "TODO:")
    for (const { test } of result.testResults) {
      if (test.result !== "todo") continue
      Log.logWithSource(LogLevel.Warn, test.path, test.source)
    }
  }
  if (result.suppressedErrors.length !== 0) {
    Log.log(LogLevel.Warn, "There are additional errors:")
    for (const error of result.suppressedErrors) {
      Log.log(LogLevel.Error, error)
    }
  }

  Log.setLevel(oldLevel)
}
