import type { TestState } from "./stateAndSetup"
import { DescribeBlock, Test } from "./tests"
import { ReloadState } from "../constants"
import { assertNever } from "../util"

declare const global: {
  __testResume?: {
    oldConfiguration: DescribeBlock
    test: Test
    partIndex: number
  }
}

export function prepareReload(testState: TestState): void {
  const currentRun = testState.currentTestRun!
  global.__testResume = {
    oldConfiguration: testState.rootBlock,
    test: currentRun.test,
    partIndex: currentRun.partIndex + 1,
  }
  testState.setReloadState(ReloadState.ToReload)
}

// -- Reload recovery --

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

export function onLoad(testState: TestState):
  | {
      result: "init"
    }
  | {
      result: "resumed"
      test: Test
      partIndex: number
    }
  | {
      result: "config changed after reload"
      test: Test
    }
  | {
      result: "unexpected reload"
    } {
  const reloadState = testState.getReloadState()
  switch (reloadState) {
    case ReloadState.Loaded:
      return { result: "init" }
    case ReloadState.ToReload: {
      const testResume =
        global.__testResume ??
        error("__testResume not set while reloadState is 'ToReload'")

      global.__testResume = undefined
      const current = testState.rootBlock
      const stored = testResume.oldConfiguration
      const test = compareAndFindTest(current, stored, testResume.test)
      if (!test) {
        return {
          result: "config changed after reload",
          test: testResume.test,
        }
      }

      return {
        result: "resumed",
        test,
        partIndex: testResume.partIndex,
      }
    }
    case ReloadState.Running:
      return { result: "unexpected reload" }
    case ReloadState.Uninitialized:
    case ReloadState.Completed:
    case ReloadState.LoadError: {
      return error(
        "Unexpected reload state when test runner loaded: " + reloadState,
      )
    }
    default:
      assertNever(reloadState)
      break
  }
}
