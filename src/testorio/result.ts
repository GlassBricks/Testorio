import { TestListener } from "./testEvents"
import { Source } from "./tests"

export interface RunResults {
  ran: number
  passed: number
  failed: number
  skipped: number
  todo: number

  tests: {
    path: string
    source: Source
    errors: string[]
    result: "passed" | "failed" | "skipped" | "todo"
  }[]
  suppressedErrors: string[]

  status: "not completed" | "passed" | "failed" | "todo"
}

export function createRunResult(): RunResults {
  return {
    failed: 0,
    passed: 0,
    ran: 0,
    skipped: 0,
    todo: 0,
    status: "not completed",
    suppressedErrors: [],
    tests: [],
  }
}

export const resultCollector: TestListener = (event, state) => {
  const results = state.results
  switch (event.type) {
    case "testPassed": {
      results.ran++
      results.passed++
      const { path, source, errors } = event.test
      results.tests.push({
        path,
        source,
        errors,
        result: "passed",
      })
      break
    }
    case "testFailed": {
      results.ran++
      results.failed++
      const { path, source, errors } = event.test
      results.tests.push({
        path,
        source,
        errors,
        result: "failed",
      })
      break
    }
    case "testSkipped": {
      results.skipped++
      const { path, source, errors } = event.test
      results.tests.push({
        path,
        source,
        errors,
        result: "skipped",
      })
      break
    }
    case "testTodo": {
      results.todo++
      const { path, source, errors } = event.test
      results.tests.push({
        path,
        source,
        errors,
        result: "todo",
      })
      break
    }
    case "exitDescribeBlock":
      break
    case "finishTestRun":
      if (results.failed !== 0 || results.suppressedErrors.length !== 0) {
        results.status = "failed"
      } else if (results.todo !== 0) {
        results.status = "todo"
      } else {
        results.status = "passed"
      }
      break
  }
}
