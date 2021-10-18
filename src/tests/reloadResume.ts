import type { TestState } from "./setup"
import { DescribeBlock, Test } from "./tests"
import { ReloadedForTest } from "../constants"

declare const global: {
  __testResume?: {
    oldConfiguration: DescribeBlock
    test: Test
    partIndex: number
  }
}

export function prepareResume(testState: TestState): void {
  const currentRun = testState.currentTestRun!
  global.__testResume = {
    oldConfiguration: testState.rootBlock,
    test: currentRun.test,
    partIndex: currentRun.partIndex + 1,
  }
  settings.global[ReloadedForTest] = { value: true }
}

// maybe this should just like... not be there?

const mutableTestState: Partial<Record<keyof Test, true>> = {
  result: true,
  errors: true,
}

function compareAndFindTest(
  current: unknown,
  stored: unknown,
  storedTest: Test,
): Test | undefined {
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

export function tryResume(testState: TestState):
  | {
      result: "resumed"
      test: Test
      partIndex: number
    }
  | {
      test: Test
      result: "configuration changed"
    }
  | undefined {
  const testResume = global.__testResume
  if (!testResume) return undefined
  global.__testResume = undefined

  const current = testState.rootBlock
  const stored = testResume.oldConfiguration
  const test = compareAndFindTest(current, stored, testResume.test)
  if (!test) {
    return {
      result: "configuration changed",
      test: testResume.test,
    }
  }

  return {
    result: "resumed",
    test,
    partIndex: testResume.partIndex,
  }
}
