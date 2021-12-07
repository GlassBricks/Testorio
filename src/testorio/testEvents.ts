import { DescribeBlock, Test } from "./tests"
import { TestState } from "./state"

interface BaseTestEvent {
  type: string
}
export interface StartTestRun extends BaseTestEvent {
  type: "startTestRun"
}
export interface EnterDescribeBlock extends BaseTestEvent {
  type: "enterDescribeBlock"
  block: DescribeBlock
}
export interface TestEntered extends BaseTestEvent {
  type: "testEntered"
  test: Test
}
export interface TestStarted extends BaseTestEvent {
  type: "testStarted"
  test: Test
}
export interface TestPassed extends BaseTestEvent {
  type: "testPassed"
  test: Test
}
export interface TestFailed extends BaseTestEvent {
  type: "testFailed"
  test: Test
}
export interface TestSkipped extends BaseTestEvent {
  type: "testSkipped"
  test: Test
}
export interface TestTodo extends BaseTestEvent {
  type: "testTodo"
  test: Test
}
export interface ExitDescribeBlock extends BaseTestEvent {
  type: "exitDescribeBlock"
  block: DescribeBlock
}
export interface FinishTestRun extends BaseTestEvent {
  type: "finishTestRun"
}
export interface LoadError extends BaseTestEvent {
  type: "loadError"
}

export type TestEvent =
  | StartTestRun
  | EnterDescribeBlock
  | TestEntered
  | TestStarted
  | TestPassed
  | TestFailed
  | TestSkipped
  | TestTodo
  | ExitDescribeBlock
  | FinishTestRun
  | LoadError

export type TestListener = (event: TestEvent, state: TestState) => void

const testListeners: TestListener[] = []
export function addTestListeners(...listeners: TestListener[]): void {
  testListeners.push(...listeners)
}

export function _raiseTestEvent(state: TestState, event: TestEvent) {
  for (const handler of testListeners) {
    handler(event, state)
  }
}
