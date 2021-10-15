import * as Log from "./Log"
import { LogLevel } from "./Log"
import { tryResume } from "./reloadResume"
import reportRunResult from "./report"
import { getTestState, resetTestState, TestRun, TestState } from "./setup"
import { DescribeBlock, formatSource, Hook, OnTickFn, Test } from "./tests"
import { assertNever } from "./util"

interface EnterDescribe {
  type: "enterDescribe"
  block: DescribeBlock
}

interface EnterTest {
  type: "enterTest"
  test: Test
  waitTicks: number
}

interface RunTestPart {
  type: "runTestPart"
  testRun: TestRun
}

interface WaitForTestPart {
  type: "waitForTestPart"
  testRun: TestRun
  waitTicks: 1
}

interface LeaveTest {
  type: "leaveTest"
  testRun: TestRun
}

interface LeaveDescribe {
  type: "leaveDescribe"
  block: DescribeBlock
}

type Task =
  | EnterDescribe
  | EnterTest
  | RunTestPart
  | WaitForTestPart
  | LeaveTest
  | LeaveDescribe

export interface TestRunner {
  tick(): void
  reportResult(): void
  isDone(): boolean
}
let thisFileName = debug.getinfo(1)!.short_src
assert(thisFileName.endsWith(".lua"))
thisFileName = "\t" + thisFileName.substr(0, thisFileName.length - 4)

export function createRunner(state: TestState): TestRunner {
  function isSkippedTest(test: Test) {
    return (
      test.mode === "skip" ||
      test.mode === "todo" ||
      (state.hasFocusedTests && test.mode !== "only")
    )
  }

  function hasAnyTest(block: DescribeBlock): boolean {
    return block.children.some((child) =>
      child.type === "test" ? !isSkippedTest(child) : hasAnyTest(child),
    )
  }

  function addErrorToAllTests(block: DescribeBlock, error: string): void {
    for (const child of block.children) {
      if (child.type === "describeBlock") {
        addErrorToAllTests(block, error)
      } else if (child.type === "test") {
        child.errors.push(error)
      }
    }
  }

  function getErrorWithStacktrace(error: unknown): string {
    const stacktrace =
      error instanceof Error
        ? error.toString()
        : debug.traceback(tostring(error), 3)
    // level: 1 = here, 2 = getErrorWithStackTrace(), 3 = error location

    const lines = stacktrace.split("\n")
    for (let i = 1; i < lines.length; i++) {
      if (
        lines[i - 1].endsWith(": in function 'xpcall'") &&
        lines[i].startsWith(thisFileName)
      ) {
        if (lines[i - 2] === "\t[C]: in function 'rawxpcall'") {
          i--
        }
        return table.concat(lines, "\n", 1, i - 1)
      }
    }
    return stacktrace
  }

  function nextDescribeBlockItem(block: DescribeBlock, index: number): Task {
    const item = block.children[index]
    if (item) {
      return item.type === "describeBlock"
        ? {
            type: "enterDescribe",
            block: item,
          }
        : {
            type: "enterTest",
            test: item,
            waitTicks: item.ticksBefore,
          }
    }
    return {
      type: "leaveDescribe",
      block,
    }
  }

  function newTestRun(test: Test, partIndex: number): TestRun {
    return {
      test,
      async: false,
      timeout: 0,
      asyncDone: false,
      tickStarted: game.tick,
      onTickFuncs: new LuaTable(),
      partIndex,
    }
  }

  function nextTestTask({ testRun }: RunTestPart | WaitForTestPart): Task {
    const { test, partIndex } = testRun
    if (test.errors.length !== 0 || !testRun.async || testRun.asyncDone) {
      if (partIndex + 1 < test.parts.length) {
        return {
          type: "runTestPart",
          testRun: newTestRun(test, partIndex + 1),
        }
      }
      return {
        type: "leaveTest",
        testRun,
      }
    }
    return {
      type: "waitForTestPart",
      testRun,
      waitTicks: 1,
    }
  }

  function enterDescribe({ block }: EnterDescribe): Task {
    Log.logWithSource(LogLevel.Debug, `BLOCK: ${block.name}`, block.source)
    if (block.children.length === 0) {
      state.suppressedErrors.push(
        `${block.path} has no tests defined.\n${formatSource(block.source)}`,
      )
    } else if (hasAnyTest(block)) {
      const hooks = block.hooks.filter((x) => x.type === "beforeAll")
      for (const hook of hooks) {
        const [success, message] = xpcall(hook.func, getErrorWithStacktrace)
        if (!success) {
          addErrorToAllTests(block, `Error running ${hook.type}: ${message}`)
        }
      }
    }
    return nextDescribeBlockItem(block, 0)
  }

  function enterTest({ test }: EnterTest): Task {
    Log.logWithSource(LogLevel.Debug, `TEST:  ${test.path}`, test.source)
    // set testRun now, no errors in hooks
    const testRun = newTestRun(test, 0)
    state.currentTestRun = testRun

    if (!isSkippedTest(test)) {
      function collectHooks(block: DescribeBlock, hooks: Hook[]) {
        if (block.parent) collectHooks(block.parent, hooks)
        hooks.push(...block.hooks.filter((x) => x.type === "beforeEach"))
        return hooks
      }

      const beforeEach = collectHooks(test.parent, [])
      for (const hook of beforeEach) {
        if (test.errors.length !== 0) break
        const [success, error] = xpcall(hook.func, getErrorWithStacktrace)
        if (!success) {
          test.errors.push(error as string)
        }
      }
    }
    return {
      type: "runTestPart",
      testRun,
    }
  }

  function runTestPart(task: RunTestPart): Task {
    const { testRun } = task
    const { test, partIndex } = testRun
    const part = test.parts[partIndex]
    state.currentTestRun = testRun
    if (!isSkippedTest(test)) {
      Log.logWithSource(
        LogLevel.Trace,
        `Running test ${test.name}`,
        part.source,
      )
      if (test.errors.length === 0) {
        const [success, error] = xpcall(part.func, getErrorWithStacktrace)
        if (!success) {
          test.errors.push(error as string)
        }
      }
    }
    return nextTestTask(task)
  }

  function waitForTestPart(task: WaitForTestPart): Task {
    // run on tick events
    const { testRun } = task
    const { test, partIndex } = testRun
    const tickNumber = game.tick - testRun.tickStarted
    if (tickNumber > testRun.timeout) {
      test.errors.push(
        `Test timed out after ${testRun.timeout} ticks:\n${formatSource(
          test.parts[partIndex].source,
        )}`,
      )
    }

    for (const func of Object.keys(
      testRun.onTickFuncs,
    ) as unknown as OnTickFn[]) {
      const [success, result] = xpcall(func, getErrorWithStacktrace, tickNumber)
      if (!success) {
        test.errors.push(result as string)
        break
      } else if (result === false) {
        testRun.onTickFuncs.delete(func)
      }
    }
    return nextTestTask(task)
  }

  function leaveTest({ testRun }: LeaveTest): Task {
    const { test } = testRun
    Log.logWithSource(LogLevel.Trace, `Leaving test ${test.name}`, test.source)
    const isSkipped = isSkippedTest(test)

    if (!isSkipped) {
      function collectHooks(block: DescribeBlock, hooks: Hook[]) {
        hooks.push(...block.hooks.filter((x) => x.type === "afterEach"))
        if (block.parent) collectHooks(block.parent, hooks)
        return hooks
      }

      const afterEach = collectHooks(test.parent, [])
      for (const hook of afterEach) {
        const [success, error] = xpcall(hook.func, getErrorWithStacktrace)
        if (!success) {
          test.errors.push(error as string)
        }
      }
    }
    state.currentTestRun = undefined
    if (isSkipped) {
      if (test.mode === "todo") {
        Log.logWithSource(LogLevel.Warn, "TODO", test.source)
        test.result = "todo"
      } else {
        Log.logWithSource(LogLevel.Warn, "SKIPPED", test.source)
        test.result = "skipped"
      }
    } else if (test.errors.length > 0) {
      Log.log(LogLevel.Debug, `FAIL`)
      test.result = "failed"
    } else {
      Log.log(LogLevel.Debug, `PASS`)
      test.result = "passed"
    }

    return nextDescribeBlockItem(test.parent, test.indexInParent + 1)
  }

  function leaveDescribe({ block }: LeaveDescribe): Task | undefined {
    Log.logWithSource(
      LogLevel.Trace,
      `Leaving describe block ${block.name}`,
      block.source,
    )
    const hasTests = hasAnyTest(block)
    if (hasTests) {
      const hooks = block.hooks.filter((x) => x.type === "afterAll")
      for (const hook of hooks) {
        const [success, message] = xpcall(hook.func, getErrorWithStacktrace)
        if (!success) {
          addErrorToAllTests(block, `Error running ${hook.type}: ${message}`)
        }
      }
    }
    if (!block.parent) return undefined
    return nextDescribeBlockItem(block.parent, block.indexInParent + 1)
  }

  // export default function run(): void {
  //   for (const [, scope] of pairs(fileDescribeBlocks)) {
  //     _runBlock(scope)
  //   }
  //   reportRunResult()
  // }

  function runTask(task: Task): Task | undefined {
    switch (task.type) {
      case "enterDescribe":
        return enterDescribe(task)
      case "enterTest":
        return enterTest(task)
      case "runTestPart":
        return runTestPart(task)
      case "waitForTestPart":
        return waitForTestPart(task)
      case "leaveTest":
        return leaveTest(task)
      case "leaveDescribe":
        return leaveDescribe(task)
      default:
        assertNever(task)
    }
  }

  let ticksToWait = 0

  let nextTask: Task | undefined
  const resume = tryResume(state)
  if (!resume) {
    nextTask = {
      type: "enterDescribe",
      block: state.rootBlock,
    }
  } else if (resume.result === "configuration changed") {
    const message = `Test configuration changed after reloading: ${resume.test.path}. Aborting test run`
    Log.logWithSource(LogLevel.Error, message, resume.test.source)
    nextTask = undefined
    resetTestState()
    state = getTestState()
    state.suppressedErrors.push(message)
  } else if (resume.result === "resumed") {
    nextTask = {
      type: "runTestPart",
      testRun: newTestRun(resume.test, resume.partIndex),
    }
  }

  return {
    tick(): void {
      if (ticksToWait > 0) {
        ticksToWait--
        if (ticksToWait > 0) return
      }
      while (nextTask) {
        nextTask = runTask(nextTask)
        if (!nextTask) {
          return
        }
        const waitTicks = (nextTask as WaitForTestPart).waitTicks
        if (waitTicks && waitTicks > 0) {
          ticksToWait = waitTicks
          return
        }
      }
    },
    reportResult() {
      reportRunResult(state)
    },
    isDone(): boolean {
      return nextTask === undefined
    },
  }
}
