import type { TestState } from "./state"
import { DescribeBlock, Test } from "./tests"
import { TestStage } from "../constants"
import { RunResults } from "./result"

declare const global: {
  __testResume?: {
    rootBlock: DescribeBlock
    results: RunResults
    test: Test
    partIndex: number
  }
}

export function prepareReload(testState: TestState): void {
  const currentRun = testState.currentTestRun!
  global.__testResume = {
    rootBlock: testState.rootBlock,
    results: testState.results,
    test: currentRun.test,
    partIndex: currentRun.partIndex + 1,
  }
  testState.setTestStage(TestStage.ToReload)
}

const mutableTestState: Partial<Record<keyof Test, true>> = {
  errors: true,
}

function compareAndFindTest(current: unknown, stored: unknown, storedTest: Test): Test | undefined {
  const seen = new LuaTable<AnyNotNil, AnyNotNil>()

  function compare(a: any, b: any): boolean {
    // ignore functions
    if (typeof a === "function") return true
    if (typeof a !== "object" || typeof b !== "object") {
      return a === b
    }
    if (seen.get(b) === a) return true
    seen.set(b, a)
    for (const [k, v] of pairs(a)) {
      if (a.type === "test" && k in mutableTestState) {
        a[k] = b[k]
        continue
      }
      if (!compare(v, b[k])) {
        return false
      }
    }
    for (const [k, v] of pairs(b)) {
      if (a[k] === undefined) {
        if (a.type === "test" && k in mutableTestState) {
          a[k] = v
        } else {
          return false
        }
      }
    }
    return true
  }

  if (compare(current, stored)) {
    return seen.get(storedTest) as Test
  }
  return undefined
}

export function resumeAfterReload(state: TestState): {
  test: Test
  partIndex: number | undefined
} {
  const testResume = global.__testResume ?? error("__testResume not set while attempting to resume")

  global.__testResume = undefined
  const stored = testResume.rootBlock
  const test = compareAndFindTest(state.rootBlock, stored, testResume.test)
  state.results = testResume.results
  return test
    ? {
        test,
        partIndex: testResume.partIndex,
      }
    : {
        test: testResume.test,
        partIndex: undefined,
      }
}
