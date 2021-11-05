import { DescribeBlock, Test } from "./tests"
import { loggingHandler, setupHandler } from "./eventHandlers"
import { onTestEvent } from "./eventIds"

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

export type TestEvent =
  | StartTestRun
  | EnterDescribeBlock
  | TestStarted
  | TestPassed
  | TestFailed
  | TestSkipped
  | TestTodo
  | ExitDescribeBlock
  | FinishTestRun

export type TestEventHandler = (type: TestEvent) => void

const _onEventHandlers: TestEventHandler[] = []
export function addTestEventHandler(handler: TestEventHandler): void {
  _onEventHandlers.push(handler)
}

export function _raiseTestEvent(event: TestEvent) {
  for (const handler of _onEventHandlers) {
    handler(event)
  }
}

addTestEventHandler(setupHandler)
addTestEventHandler(loggingHandler)
addTestEventHandler((event) => {
  script.raise_event(onTestEvent, event)
})
