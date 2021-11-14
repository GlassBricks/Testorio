import { resumeAfterReload } from "./resume"
import { makeLoadError, TestRun, TestState } from "./state"
import { DescribeBlock, formatSource, Hook, isSkippedTest, Test } from "./tests"
import { assertNever } from "./util"
import { Remote, TestStage } from "../shared-constants"
import TestFn = Testorio.TestFn
import OnTickFn = Testorio.OnTickFn

interface StartTestRun {
  type: "startTestRun"
}

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

interface FinishTestRun {
  type: "finishTestRun"
}

interface ReportLoadError {
  type: "reportLoadError"
}

type Task =
  | StartTestRun
  | EnterDescribe
  | EnterTest
  | RunTestPart
  | WaitForTestPart
  | LeaveTest
  | LeaveDescribe
  | FinishTestRun
  | ReportLoadError

export interface TestRunner {
  tick(): void

  isDone(): boolean
}

let thisFileName = debug.getinfo(1)!.short_src
assert(thisFileName.endsWith(".lua"))
thisFileName = "\t" + thisFileName.substr(0, thisFileName.length - 4)

const enum LoadResult {
  FirstLoad,
  ResumeAfterReload,
  ConfigChangedAfterReload,
  AlreadyRunning,
}

function onLoad(testState: TestState):
  | {
      result: LoadResult.FirstLoad
    }
  | {
      result: LoadResult.ResumeAfterReload
      test: Test
      partIndex: number
    }
  | {
      result: LoadResult.ConfigChangedAfterReload
      test: Test
    }
  | {
      result: LoadResult.AlreadyRunning
    } {
  if (game.is_multiplayer()) {
    error("Tests cannot be in run in multiplayer")
  }
  const testStage = testState.getTestStage()
  switch (testStage) {
    case TestStage.NotRun:
      return remote.interfaces[Remote.RunTests]
        ? { result: LoadResult.FirstLoad }
        : error("Test runner trying to be created when tests not loaded")
    case TestStage.ToReload: {
      const { test, partIndex } = resumeAfterReload(testState)
      return partIndex
        ? {
            result: LoadResult.ResumeAfterReload,
            test,
            partIndex,
          }
        : {
            result: LoadResult.ConfigChangedAfterReload,
            test,
          }
    }
    case TestStage.Running:
      return { result: LoadResult.AlreadyRunning }
    case TestStage.Completed:
    case TestStage.LoadError:
      return error("Unexpected reload state when test runner loaded: " + testStage)
    default:
      assertNever(testStage)
      break
  }
}

export function createRunner(state: TestState): TestRunner {
  function hasAnyTest(block: DescribeBlock): boolean {
    return block.children.some((child) => (child.type === "test" ? !isSkippedTest(child, state) : hasAnyTest(child)))
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
    const stacktrace = error instanceof Error ? error.toString() : debug.traceback(tostring(error), 3)
    // level: 1 = here, 2 = getErrorWithStackTrace(), 3 = error location

    const lines = stacktrace.split("\n")
    for (let i = 1; i < lines.length; i++) {
      if (lines[i - 1].endsWith(": in function 'xpcall'") && lines[i].startsWith(thisFileName)) {
        if (lines[i - 2] === "\t[C]: in function 'rawxpcall'") {
          i--
        }
        return table.concat(lines, "\n", 1, i - 1)
      }
    }
    return stacktrace
  }

  function startTestRun(): Task {
    state.raiseTestEvent({
      type: "startTestRun",
    })
    return {
      type: "enterDescribe",
      block: state.rootBlock,
    }
  }

  function finishTestRun(): undefined {
    state.raiseTestEvent({
      type: "finishTestRun",
    })
    return
  }

  function reportLoadError(): undefined {
    state.raiseTestEvent({
      type: "loadError",
    })
    return
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
    state.raiseTestEvent({
      type: "enterDescribeBlock",
      block,
    })

    if (block.children.length === 0) {
      state.suppressedErrors.push(`${block.path} has no tests defined.\n${formatSource(block.source)}`)
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
    // set testRun now, no errors in hooks
    const testRun = newTestRun(test, 0)
    state.currentTestRun = testRun
    state.raiseTestEvent({
      type: "testStarted",
      test,
    })

    if (!isSkippedTest(test, state)) {
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
    if (!isSkippedTest(test, state)) {
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
      test.errors.push(`Test timed out after ${testRun.timeout} ticks:\n${formatSource(test.parts[partIndex].source)}`)
    }

    for (const func of Object.keys(testRun.onTickFuncs) as unknown as OnTickFn[]) {
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
    const isSkipped = isSkippedTest(test, state)

    if (!isSkipped) {
      function collectHooks(block: DescribeBlock, hooks: TestFn[]) {
        hooks.push(...block.hooks.filter((x) => x.type === "afterEach").map((x) => x.func))
        if (block.parent) collectHooks(block.parent, hooks)
        return hooks
      }

      const afterEach = collectHooks(test.parent, [...test.afterTest])

      for (const hook of afterEach) {
        const [success, error] = xpcall(hook, getErrorWithStacktrace)
        if (!success) {
          test.errors.push(error as string)
        }
      }
    }
    state.currentTestRun = undefined
    if (isSkipped) {
      if (test.mode === "todo") {
        state.raiseTestEvent({
          type: "testTodo",
          test,
        })
      } else {
        state.raiseTestEvent({
          type: "testSkipped",
          test,
        })
      }
    } else if (test.errors.length > 0) {
      state.raiseTestEvent({
        type: "testFailed",
        test,
      })
    } else {
      state.raiseTestEvent({
        type: "testPassed",
        test,
      })
    }

    return nextDescribeBlockItem(test.parent, test.indexInParent + 1)
  }

  function leaveDescribe({ block }: LeaveDescribe): Task | undefined {
    const hasTests = hasAnyTest(block)
    if (hasTests) {
      const hooks = block.hooks.filter((x) => x.type === "afterAll")
      for (const hook of hooks) {
        const [success, message] = xpcall(hook.func, getErrorWithStacktrace)
        if (!success) {
          state.suppressedErrors.push(`Error running ${hook.type}: ${message}`)
        }
      }
    }
    state.raiseTestEvent({
      type: "exitDescribeBlock",
      block,
    })
    return block.parent
      ? nextDescribeBlockItem(block.parent, block.indexInParent + 1)
      : {
          type: "finishTestRun",
        }
  }

  function runTask(task: Task): Task | undefined {
    switch (task.type) {
      case "startTestRun":
        return startTestRun()
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
      case "finishTestRun":
        return finishTestRun()
      case "reportLoadError":
        return reportLoadError()
      default:
        assertNever(task)
    }
  }

  let ticksToWait = 0
  let nextTask: Task | undefined

  function createLoadError(message: string) {
    makeLoadError(state, message)
    nextTask = {
      type: "reportLoadError",
    }
  }

  const resume = onLoad(state)
  if (resume.result === LoadResult.FirstLoad) {
    nextTask = {
      type: "startTestRun",
    }
    state.setTestStage(TestStage.Running)
  } else if (resume.result === LoadResult.ResumeAfterReload) {
    nextTask = {
      type: "runTestPart",
      testRun: newTestRun(resume.test, resume.partIndex),
    }
    state.setTestStage(TestStage.Running)
  } else if (resume.result === LoadResult.ConfigChangedAfterReload) {
    createLoadError(`Tests changed after reloading: ${resume.test.path}. Aborting test run.`)
  } else if (resume.result === LoadResult.AlreadyRunning) {
    createLoadError(
      `Save was unexpectedly reloaded while tests were running. This will cause tests to break. Aborting test run`,
    )
  } else {
    assertNever(resume)
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
          if (state.getTestStage() !== "LoadError") state.setTestStage(TestStage.Completed)
          return
        }
        const waitTicks = (nextTask as WaitForTestPart).waitTicks
        if (waitTicks && waitTicks > 0) {
          ticksToWait = waitTicks
          return
        }
      }
    },
    isDone() {
      return nextTask === undefined
    },
  }
}
