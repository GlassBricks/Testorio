import { prepareResume } from "./reloadResume"
import {
  addDescribeBlock,
  addTest,
  createRootDescribeBlock,
  DescribeBlock,
  HookFn,
  HookType,
  OnTickFn,
  Source,
  Test,
  TestFn,
  TestMode,
} from "./tests"

export interface TestState {
  readonly rootBlock: DescribeBlock
  // setup
  currentBlock?: DescribeBlock
  hasFocusedTests: boolean

  // run
  currentTestRun?: TestRun
  suppressedErrors: string[]
}

export interface TestRun {
  test: Test
  partIndex: number
  async: boolean
  timeout: number
  asyncDone: boolean
  tickStarted: number
  onTickFuncs: LuaTable<OnTickFn, true>
}

const testStateSymbol = Symbol("test state")

export function getTestState(): TestState {
  const testState = (_G as any)[testStateSymbol] as TestState | undefined
  if (!testState) {
    error("Tests are not configured to be run")
  }
  return testState
}

export function _setTestState(state: TestState): void {
  ;(_G as any)[testStateSymbol] = state
}

export function resetTestState(): void {
  const rootBlock = createRootDescribeBlock()
  _setTestState({
    rootBlock,
    currentBlock: rootBlock,
    hasFocusedTests: false,
    suppressedErrors: [],
  })
}

function getCallerSource(upStack: number = 1): Source {
  const info = debug.getinfo(upStack + 2, "Sl") || {}
  return {
    file: info.source,
    line: info.currentline,
  }
}

export function getCurrentBlock(): DescribeBlock {
  const block = getTestState().currentBlock
  if (!block) {
    error("Tests and hooks cannot be added/configured at this time")
  }
  return block
}

export function getCurrentTestRun(): TestRun {
  const run = getTestState().currentTestRun
  if (!run) {
    error("This can only be used during a test", 3)
  }
  return run
}

function addHook(type: HookType, func: HookFn): void {
  const state = getTestState()
  if (state.currentTestRun) {
    error(
      `Hook (${type}) cannot be nested inside test "${state.currentTestRun.test.path}"`,
    )
  }
  getCurrentBlock().hooks.push({
    type,
    func,
  })
}

/** @noSelf */
interface TestCreatorBase {
  (name: string, func: TestFn): TestBuilder

  each<V extends any[]>(
    values: V[],
    name: string,
    func: (...values: V) => void,
  ): TestBuilder<typeof func>
  each<T>(
    values: T[],
    name: string,
    func: (value: T) => void,
  ): TestBuilder<typeof func>
}

/** @noSelf */
interface TestCreator extends TestCreatorBase {
  skip: TestCreatorBase
  only: TestCreatorBase
  todo(name: string): void
}

/** @noSelf */
interface DescribeCreatorBase {
  (name: string, func: TestFn): void

  each<V extends any[]>(
    values: V[],
    name: string,
    func: (...values: V) => void,
  ): void
  each<T>(values: T[], name: string, func: (value: T) => void): void
}

/** @noSelf */
interface DescribeCreator extends DescribeCreatorBase {
  skip: DescribeCreatorBase
  only: DescribeCreatorBase
}

function createTest(
  name: string,
  func: TestFn,
  mode: TestMode,
  upStack: number = 1,
): Test {
  const state = getTestState()
  if (state.currentTestRun) {
    error(
      `Test "${name}" cannot be nested inside test "${state.currentTestRun.test.path}"`,
    )
  }
  const currentBlock = getCurrentBlock()
  if (currentBlock.mode === "skip" && mode !== "todo") {
    mode = "skip"
  }
  if (mode === "only") {
    state.hasFocusedTests = true
  }
  return addTest(currentBlock, name, getCallerSource(upStack + 1), func, mode)
}

// eslint-disable-next-line @typescript-eslint/ban-types
function addNext(test: Test, func: TestFn, funcForSource: Function = func) {
  const info = debug.getinfo(funcForSource, "Sl")
  const source: Source = {
    file: info.source,
    line: info.linedefined,
  }
  test.parts.push({
    func,
    source,
  })
}

/** @noSelf */
export interface TestBuilder<F extends (...args: any) => void = TestFn> {
  next(func: F): TestBuilder<F>
  after_ticks(ticks: number, func: F): TestBuilder<F>
  after_script_reload(func: F): TestBuilder<F>
  after_mod_reload(func: F): TestBuilder<F>
}

function createTestBuilder<F extends () => void>(nextFn: (func: F) => void) {
  function reloadFunc(reload: () => void) {
    return (func: F) =>
      result
        .next((() => {
          prepareResume(getTestState())
          async(1)
          reload()
        }) as F)
        .next(func)
  }

  const result: TestBuilder<F> = {
    next(func) {
      nextFn(func)
      return result
    },
    after_ticks(ticks, func): TestBuilder<F> {
      result
        .next((() => {
          async()
          after_ticks(ticks, done)
        }) as F)
        .next(func)
      return result
    },
    after_script_reload: reloadFunc(() => game.reload_script()),
    after_mod_reload: reloadFunc(() => game.reload_mods()),
  }
  return result
}

function propagateFocus(block: DescribeBlock) {
  if (
    block.mode === "only" &&
    block.children.every((child) => child.mode !== "only")
  ) {
    for (const child of block.children) {
      if (child.mode !== undefined) continue
      child.mode = "only"
      if (child.type === "describeBlock") {
        propagateFocus(block)
      }
    }
  }
}

function createDescribe(
  name: string,
  block: TestFn,
  mode: TestMode,
  upStack: number = 1,
): DescribeBlock | undefined {
  const state = getTestState()
  if (state.currentTestRun) {
    error(
      `Describe block "${name}" cannot be nested inside test "${state.currentTestRun.test.path}"`,
    )
  }

  const source = getCallerSource(upStack + 1)

  const previousBlock = getCurrentBlock()
  if (previousBlock.mode === "skip") {
    mode = "skip"
  }
  if (mode === "only") {
    state.hasFocusedTests = true
  }

  const describeBlock = addDescribeBlock(previousBlock, name, source, mode)
  state.currentBlock = describeBlock
  block()
  state.currentBlock = previousBlock
  propagateFocus(describeBlock)
  return describeBlock
}

function setCall<T extends object, F extends (...args: any) => any>(
  obj: T,
  func: F,
): T & F {
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
    const rowValues = (row as unknown[]).map((v) =>
      typeof v === "object" ? serpent.line(v) : v,
    )
    const itemName = string.format(name, ...rowValues)

    return {
      name: itemName,
      row,
    }
  })
}

function createTestEach(mode: TestMode): TestCreatorBase {
  const eachFn: TestCreatorBase["each"] = (
    values: unknown[][],
    name: string,
    func: (...values: any[]) => void,
  ) => {
    const items = createEachItems(values, name)
    const testBuilders = items.map(({ row, name }) => {
      const test = createTest(
        name,
        () => {
          func(...row)
        },
        mode,
        2,
      )
      return { test, row }
    })
    return createTestBuilder<(...args: unknown[]) => void>((func) => {
      for (const { test, row } of testBuilders) {
        addNext(
          test,
          () => {
            func(...row)
          },
          func,
        )
      }
    })
  }
  return setCall(
    {
      each: eachFn,
    },
    (name, func) => {
      const test = createTest(name, func, mode)
      return createTestBuilder((func1) => addNext(test, func1))
    },
  )
}

function createDescribeEach(mode: TestMode): DescribeCreatorBase {
  const eachFn: DescribeCreatorBase["each"] = (
    values: unknown[][],
    name: string,
    func: (...values: any[]) => void,
  ) => {
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

const DEFAULT_TIMEOUT = 60 * 60

export namespace setup {
  export const test = createTestEach(undefined) as TestCreator
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

  export const it = test

  export const describe = createDescribeEach(undefined) as DescribeCreator
  describe.skip = createDescribeEach("skip")
  describe.only = createDescribeEach("only")

  export function beforeAll(func: HookFn): void {
    addHook("beforeAll", func)
  }

  export function afterAll(func: HookFn): void {
    addHook("afterAll", func)
  }

  export function beforeEach(func: HookFn): void {
    addHook("beforeEach", func)
  }

  export function afterEach(func: HookFn): void {
    addHook("afterEach", func)
  }

  export function async(timeout: number = DEFAULT_TIMEOUT): void {
    const testRun = getCurrentTestRun()
    if (testRun.async) {
      error("test is already async")
    }
    if (timeout < 1) {
      error("test timeout must be greater than 0")
    }
    testRun.timeout = timeout
    testRun.async = true
  }

  export function done(): void {
    const testRun = getCurrentTestRun()

    if (!testRun.async) {
      error(`"done" can only be used when test is async`)
    }
    if (testRun.asyncDone) {
      error(`async test is already marked as done`)
    }
    testRun.asyncDone = true
  }

  export function on_tick(func: OnTickFn): void {
    const testRun = getCurrentTestRun()
    if (!testRun.async) {
      error("on_tick can only be used in async tests")
    }
    testRun.onTickFuncs.set(func, true)
  }

  export function after_ticks(ticks: number, func: TestFn): void {
    const testRun = getCurrentTestRun()
    const finishTick = game.ticks_played - testRun.tickStarted + ticks
    if (ticks < 1) {
      error("after_ticks amount must be positive")
    }
    on_tick((tick) => {
      if (tick >= finishTick) {
        func()
        return false
      }
    })
  }

  export function ticks_between_tests(ticks: number): void {
    if (ticks < 0) {
      error("ticks between tests must be 0 or greater")
    }
    getCurrentBlock().ticksBetweenTests = ticks
  }
}
