import { TestStage } from "../shared-constants"
import { RunResults } from "./result"
import type { TestState } from "./state"
import { DescribeBlock, Test } from "./tests"

declare const global: {
  __testResume?: {
    rootBlock: DescribeBlock
    results: RunResults
    profiler: LuaProfiler
    test: Test
    partIndex: number
  }
}

// removes all function types from the resume state
function removeFunctions(block: DescribeBlock): DescribeBlock {
  const seen = new LuaTable<any>()

  function visit(obj: unknown) {
    if (typeof obj !== "object") {
      return
    }
    if (seen.has(obj)) {
      return undefined
    }
    seen.set(obj, true)

    for (const [key, value] of pairs(obj)) {
      if (typeof value === "function") {
        ;(obj as any)[key] = undefined
      } else {
        visit(value)
      }
    }
  }

  visit(block)
  return block
}

export function prepareReload(testState: TestState): void {
  const currentRun = testState.currentTestRun!
  global.__testResume = {
    rootBlock: removeFunctions(testState.rootBlock),
    results: testState.results,
    test: currentRun.test,
    partIndex: currentRun.partIndex + 1,
    profiler: testState.profiler!,
  }
  testState.setTestStage(TestStage.ToReload)
}

const copiedTestState: Partial<Record<keyof Test, true>> = {
  errors: true,
  profiler: true,
}
const copiedDescribeBlockState: Partial<Record<keyof DescribeBlock, true>> = {
  errors: true,
}

function compareAndFindTest(current: unknown, stored: unknown, storedTest: Test): Test | undefined {
  const seen = new LuaTable<AnyNotNil, AnyNotNil>()

  function compareAndCopy(cur: Record<any, any>, old: Record<any, any>): boolean {
    if (typeof cur !== "object" || typeof old !== "object") {
      return cur === old
    }
    if (seen.get(old) === cur) return true
    seen.set(old, cur)
    for (const [k, v] of pairs(cur)) {
      if (typeof v === "function") continue
      if (cur.type === "test" && k in copiedTestState) {
        cur[k] = old[k]
        continue
      }
      if (cur.type === "describeBlock" && k in copiedDescribeBlockState) {
        cur[k] = old[k]
        continue
      }
      if (!compareAndCopy(v, old[k])) {
        return false
      }
    }
    for (const [k, v] of pairs(old)) {
      if (cur[k] === undefined) {
        if (cur.type === "test" && k in copiedTestState) {
          cur[k] = v
        } else if (cur.type === "describeBlock" && k in copiedDescribeBlockState) {
          cur[k] = v
        } else {
          return false
        }
      }
    }
    return true
  }

  if (compareAndCopy(current as any, stored as any)) {
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
  state.profiler = testResume.profiler
  state.reloaded = true
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
