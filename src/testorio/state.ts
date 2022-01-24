/** @noSelfInFile */
import { Remote, TestStage } from "../shared-constants"
import { createRunResult, RunResults } from "./result"
import { _raiseTestEvent, TestEvent } from "./testEvents"
import { createRootDescribeBlock, DescribeBlock, Tags, Test } from "./tests"
import Config = Testorio.Config
import OnTickFn = Testorio.OnTickFn

/** @noSelf */
export interface TestState {
  config: Config
  rootBlock: DescribeBlock
  // setup
  currentBlock?: DescribeBlock
  currentTags?: Tags
  hasFocusedTests: boolean

  // run
  currentTestRun?: TestRun

  results: RunResults

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

function setGlobalTestStage(stage: TestStage): void {
  global.__testorioTestStage = stage
  script.raise_event(remote.call(Remote.Testorio, "onTestStageChanged"), { stage })
}

export function resetTestState(config: Config): void {
  const rootBlock = createRootDescribeBlock(config)
  _setTestState({
    config,
    rootBlock,
    currentBlock: rootBlock,
    hasFocusedTests: false,
    getTestStage: getGlobalTestStage,
    setTestStage: setGlobalTestStage,
    raiseTestEvent(event) {
      _raiseTestEvent(this, event)
    },
    results: createRunResult(),
  })
}

export function makeLoadError(state: TestState, error: string): void {
  state.setTestStage(TestStage.LoadError)
  state.rootBlock = createRootDescribeBlock(state.config)
  state.currentBlock = undefined
  state.currentTestRun = undefined
  state.results.additionalErrors = [error]
  game.speed = 1
}

export function getCurrentBlock(): DescribeBlock {
  const block = getTestState().currentBlock
  if (!block) {
    error("Tests and hooks cannot be added/configured at this time")
  }
  return block
}

export function getCurrentTestRun(): TestRun {
  return getTestState().currentTestRun ?? error("This can only be used during a test", 3)
}
