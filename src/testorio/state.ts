/** @noSelfInFile */
import { TestStage } from "../shared-constants"
import { createEmptyRunResults, RunResults } from "./result"
import { _raiseTestEvent, TestEvent } from "./testEvents"
import { createRootDescribeBlock, DescribeBlock, Test, TestTags } from "./tests"
import Config = Testorio.Config
import OnTickFn = Testorio.OnTickFn
import HookFn = Testorio.HookFn

/** @noSelf */
export interface TestState {
  config: Config
  rootBlock: DescribeBlock
  // setup
  currentBlock?: DescribeBlock | undefined
  currentTags?: TestTags | undefined
  hasFocusedTests: boolean

  // run
  currentTestRun?: TestRun | undefined

  results: RunResults
  profiler?: LuaProfiler
  isRerun: boolean

  reloaded?: boolean

  // state that is persistent across game reload
  // here as a function so is mock-able in meta test
  getTestStage(): TestStage
  setTestStage(state: TestStage): void

  raiseTestEvent(this: this, event: TestEvent): void
}

export interface TestRun {
  test: Test
  partIndex: number
  async: boolean
  timeout: number
  asyncDone: boolean
  tickStarted: number
  onTickFuncs: LuaTable<OnTickFn, true>
  afterTestFuncs: HookFn[]
}

let TESTORIO_TEST_STATE: TestState | undefined
declare const global: {
  __testorioTestStage?: TestStage
}

export function getTestState(): TestState {
  return TESTORIO_TEST_STATE ?? error("Tests are not configured to be run")
}

// internal, export for meta-test only
export function _setTestState(state: TestState): void {
  TESTORIO_TEST_STATE = state
}

export function getGlobalTestStage(): TestStage {
  return global.__testorioTestStage ?? TestStage.NotRun
}

const onTestStageChanged = script.generate_event_name<{ stage: TestStage }>()
export { onTestStageChanged }

function setGlobalTestStage(stage: TestStage): void {
  global.__testorioTestStage = stage
  script.raise_event(onTestStageChanged, { stage })
}

export function resetTestState(config: Config): void {
  const rootBlock = createRootDescribeBlock(config)
  _setTestState({
    config,
    rootBlock,
    currentBlock: rootBlock,
    hasFocusedTests: false,
    isRerun: false,
    results: createEmptyRunResults(),
    getTestStage: getGlobalTestStage,
    setTestStage: setGlobalTestStage,
    raiseTestEvent(event) {
      _raiseTestEvent(this, event)
    },
  })
}

export function cleanupTestState(): void {
  const state = getTestState()
  state.config = undefined!
  state.rootBlock = undefined!
  state.currentBlock = undefined
  state.currentTestRun = undefined
}

export function setToLoadErrorState(state: TestState, error: string): void {
  state.setTestStage(TestStage.LoadError)
  state.rootBlock = createRootDescribeBlock(state.config)
  state.currentBlock = undefined
  state.currentTestRun = undefined
  state.rootBlock.errors = [error]
  game.speed = 1
}

export function getCurrentBlock(): DescribeBlock {
  return getTestState().currentBlock ?? error("Tests and hooks cannot be added/configured at this time")
}
