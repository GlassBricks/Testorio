import { createRootDescribeBlock, DescribeBlock, Test } from "./tests"
import { ReloadState, Settings } from "../constants"
import OnTickFn = Testorio.OnTickFn

/** @noSelf */
export interface TestState {
  rootBlock: DescribeBlock
  // setup
  currentBlock?: DescribeBlock
  hasFocusedTests: boolean

  // run
  currentTestRun?: TestRun
  suppressedErrors: string[]

  // state that is persistent across game reload
  // here as a function so is mock-able in meta test
  getReloadState(): ReloadState
  setReloadState(state: ReloadState): void
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

declare global {
  let TESTORIO_TEST_STATE: TestState | undefined
}

// stored in settings so can be accessed even when global table is not yet loaded
export function getTestState(): TestState {
  if (!TESTORIO_TEST_STATE) {
    error("Tests are not configured to be run")
  }
  return TESTORIO_TEST_STATE
}

// internal, export for meta-test only
export function _setTestState(state: TestState): void {
  TESTORIO_TEST_STATE = state
}

export function resetTestState(): void {
  const rootBlock = createRootDescribeBlock()
  _setTestState({
    rootBlock,
    currentBlock: rootBlock,
    hasFocusedTests: false,
    suppressedErrors: [],
    getReloadState() {
      return settings.global[Settings.ReloadState].value as ReloadState
    },
    setReloadState(state) {
      settings.global[Settings.ReloadState] = { value: state }
    },
  })
}

export function makeLoadError(state: TestState, error: string): void {
  state.setReloadState(ReloadState.LoadError)
  state.rootBlock = createRootDescribeBlock()
  state.currentBlock = undefined
  state.currentTestRun = undefined
  state.suppressedErrors = [error]
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
