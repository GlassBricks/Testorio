// noinspection JSUnusedGlobalSymbols

import * as util from "util"
import { pcallWithStacktrace } from "./_util"
import { prepareReload } from "./resume"
import { getCurrentBlock, getCurrentTestRun, getTestState } from "./state"
import { addDescribeBlock, addTest, createSource, DescribeBlock, HookType, Source, Tags, Test, TestMode } from "./tests"
import DescribeCreator = Testorio.DescribeCreator
import DescribeCreatorBase = Testorio.DescribeCreatorBase
import HookFn = Testorio.HookFn
import TestBuilder = Testorio.TestBuilder
import TestCreator = Testorio.TestCreator
import TestCreatorBase = Testorio.TestCreatorBase
import TestFn = Testorio.TestFn

function getCallerSource(upStack: number = 1): Source {
  const info = debug.getinfo(upStack + 2, "Sl") || {}
  return createSource(info.source, info.currentline)
}

function addHook(type: HookType, func: HookFn): void {
  const state = getTestState()
  if (state.currentTestRun) {
    error(`Hook (${type}) cannot be nested inside test "${state.currentTestRun.test.path}"`)
  }
  getCurrentBlock().hooks.push({
    type,
    func,
  })
}

function consumeTags(): Tags {
  const state = getTestState()
  const result = state.currentTags
  state.currentTags = undefined
  return result ?? {}
}

function createTest(name: string, func: TestFn, mode: TestMode, upStack: number = 1): Test {
  const state = getTestState()
  if (state.currentTestRun) {
    error(`Test "${name}" cannot be nested inside test "${state.currentTestRun.test.path}"`)
  }
  const parent = getCurrentBlock()
  if (parent.mode === "skip" && mode !== "todo") {
    mode = "skip"
  } else {
    mode ??= parent.mode
  }
  if (mode === "only") {
    state.hasFocusedTests = true
  }
  return addTest(parent, name, getCallerSource(upStack + 1), func, mode, util.merge([consumeTags(), parent.tags]))
}

// eslint-disable-next-line @typescript-eslint/ban-types
function addNext(test: Test, func: TestFn, funcForSource: Function = func) {
  const info = debug.getinfo(funcForSource, "Sl")
  const source = createSource(info.source, info.linedefined)
  test.parts.push({
    func,
    source,
  })
}

function createTestBuilder<F extends () => void>(addPart: (func: F) => void, addTag: (tag: string) => void) {
  function reloadFunc(reload: () => void, what: string, tag: string) {
    return (func: F) => {
      addPart((() => {
        async(1)
        on_tick(() => {
          prepareReload(getTestState())
          reload()
        })
      }) as F)
      addPart(func)
      addTag(tag)
      return result
    }
  }

  const result: TestBuilder<F> = {
    after_script_reload: reloadFunc(() => game.reload_script(), "script", "after_script_reload"),
    after_mod_reload: reloadFunc(() => game.reload_mods(), "mods", "after_mod_reload"),
  }
  return result
}

function createDescribe(name: string, block: TestFn, mode: TestMode, upStack: number = 1): DescribeBlock | undefined {
  const state = getTestState()
  if (state.currentTestRun) {
    error(`Describe block "${name}" cannot be nested inside test "${state.currentTestRun.test.path}"`)
  }

  const source = getCallerSource(upStack + 1)

  const parent = getCurrentBlock()
  if (parent.mode === "skip") {
    mode = "skip"
  } else {
    mode ??= parent.mode
  }
  if (mode === "only") {
    state.hasFocusedTests = true
  }
  const describeBlock = addDescribeBlock(parent, name, source, mode, util.merge([parent.tags, consumeTags()]))
  state.currentBlock = describeBlock
  const [success, msg] = pcallWithStacktrace(block)
  if (!success) {
    describeBlock.errors.push(`Error in definition: ${msg}`)
  }
  state.currentBlock = parent
  if (state.currentTags) {
    describeBlock.errors.push(`Tags not added to any test or describe block: ${serpent.line(state.currentTags)}`)
    state.currentTags = undefined
  }
  return describeBlock
}
function setCall<T extends object, F extends (...args: any) => any>(obj: T, func: F): T & F {
  return setmetatable(obj, {
    __call(...args: any[]) {
      return func(...args)
    },
  })
}
function createEachItems(
  values: unknown[][],
  name: string,
): {
  name: string
  row: unknown[]
}[] {
  if (values.length === 0) error(".each called with no data")
  if (!values.every((v) => Array.isArray(v))) {
    values = (values as unknown[]).map((v) => [v])
  }
  return values.map((row) => {
    const rowValues = (row as unknown[]).map((v) => (typeof v === "object" ? serpent.line(v) : v))
    const itemName = string.format(name, ...rowValues)

    return {
      name: itemName,
      row,
    }
  })
}
function createTestEach(mode: TestMode): TestCreatorBase {
  const eachFn: TestCreatorBase["each"] = (values: unknown[][], name: string, func: (...values: any[]) => void) => {
    const items = createEachItems(values, name)
    const testBuilders = items.map((item) => {
      const test = createTest(
        item.name,
        () => {
          func(...item.row)
        },
        mode,
        3,
      )
      return { test, row: item.row }
    })
    return createTestBuilder<(...args: unknown[]) => void>(
      (func) => {
        for (const { test, row } of testBuilders) {
          addNext(
            test,
            () => {
              func(...row)
            },
            func,
          )
        }
      },
      (tag) => {
        for (const { test } of testBuilders) {
          test.tags[tag] = true
        }
      },
    )
  }
  return setCall(
    {
      each: eachFn,
    },
    (name, func) => {
      const test = createTest(name, func, mode)
      return createTestBuilder(
        (func1) => addNext(test, func1),
        (tag) => (test.tags[tag] = true),
      )
    },
  )
}
function createDescribeEach(mode: TestMode): DescribeCreatorBase {
  const eachFn: DescribeCreatorBase["each"] = (values: unknown[][], name: string, func: (...values: any[]) => void) => {
    const items = createEachItems(values, name)
    for (const { row, name } of items) {
      createDescribe(
        name,
        () => {
          func(...row)
        },
        mode,
        2,
      )
    }
  }
  return setCall(
    {
      each: eachFn,
    },
    (name, func) => createDescribe(name, func, mode),
  )
}
const test = createTestEach(undefined) as TestCreator
test.skip = createTestEach("skip")
test.only = createTestEach("only")
test.todo = (name: string) => {
  createTest(
    name,
    () => {
      //noop
    },
    "todo",
  )
}
const describe = createDescribeEach(undefined) as DescribeCreator
describe.skip = createDescribeEach("skip")
describe.only = createDescribeEach("only")

function tags(...tags: string[]) {
  const block = getCurrentBlock()
  const state = getTestState()
  if (state.currentTags) {
    block.errors.push(`Double call to tags()`)
  }
  state.currentTags = util.list_to_map(tags)
}

type Globals =
  | `${"before" | "after"}_${"each" | "all"}`
  | "async"
  | "done"
  | "on_tick"
  | "after_ticks"
  | "ticks_between_tests"
  | "test"
  | "it"
  | "describe"
  | "tags"

export const globals: Pick<typeof globalThis, Globals> = {
  test,
  it: test,
  describe,
  tags,

  before_all(func) {
    addHook("beforeAll", func)
  },

  after_all(func) {
    addHook("afterAll", func)
  },

  before_each(func) {
    addHook("beforeEach", func)
  },

  after_each(func) {
    addHook("afterEach", func)
  },

  async(timeout) {
    const testRun = getCurrentTestRun()
    if (testRun.async) {
      error("test is already async")
    }
    if (!timeout) {
      timeout = getTestState().config.default_timeout
    }
    if (timeout < 1) {
      error("test timeout must be greater than 0")
    }
    testRun.timeout = timeout
    testRun.async = true
  },
  done() {
    const testRun = getCurrentTestRun()

    if (!testRun.async) {
      error(`"done" can only be used when test is async`)
    }
    if (testRun.asyncDone) {
      error(`async test is already marked as done`)
    }
    testRun.asyncDone = true
  },
  on_tick(func) {
    const testRun = getCurrentTestRun()
    if (!testRun.async) {
      error("on_tick can only be used in async tests")
    }
    testRun.onTickFuncs.set(func, true)
  },
  after_ticks(ticks, func) {
    const testRun = getCurrentTestRun()
    const finishTick = game.tick - testRun.tickStarted + ticks
    if (ticks < 1) {
      error("after_ticks amount must be positive")
    }
    on_tick((tick) => {
      if (tick >= finishTick) {
        func()
        return false
      }
    })
  },
  ticks_between_tests(ticks) {
    if (ticks < 0) {
      error("ticks between tests must be 0 or greater")
    }
    getCurrentBlock().ticksBetweenTests = ticks
  },
}
