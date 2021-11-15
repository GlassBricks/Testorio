import { createRunner } from "../runner"
import { _setTestState, getTestState, resetTestState, TestState } from "../state"
import { DescribeBlock, Test } from "../tests"
import { TestStage } from "../../shared-constants"
import { TestEvent } from "../testEvents"
import { resultCollector } from "../result"

// simulated test environment
let actions: unknown[] = []
let events: TestEvent[] = []
let mockTestState: TestState
let originalTestState: TestState

before_each(() => {
  actions = []
  events = []
  originalTestState = getTestState()
  resetTestState({})
  mockTestState = getTestState()

  let testStage = TestStage.NotRun
  mockTestState.getTestStage = () => testStage
  mockTestState.setTestStage = (state) => {
    testStage = state
  }
  mockTestState.raiseTestEvent = (event) => {
    events.push(event)
    if (event.type !== "finishTestRun" && event.type !== "loadError") resultCollector(event, mockTestState)
  }
})

after_each(() => {
  _setTestState(originalTestState)
  const testStage = mockTestState.getTestStage()
  if (mockTestState.rootBlock.children.length > 0 && testStage === TestStage.NotRun) {
    error("Simulated test defined but not run")
  }
})

function getFirst<T extends Test | DescribeBlock = Test>(): T {
  return mockTestState.rootBlock.children[0] as T
}

function runTestSync<T extends Test | DescribeBlock = Test>(): T {
  if (mockTestState.getTestStage() === TestStage.NotRun) {
    const runner = createRunner(mockTestState)
    runner.tick()
    if (!runner.isDone()) {
      error("Tests not completed in one tick")
    }
  }
  return getFirst()
}

function runTestAsync<T extends Test | DescribeBlock = Test>(callback: (item: T) => void): void {
  if (mockTestState.getTestStage() !== TestStage.NotRun) {
    error("duplicate call to runTestAsync/cannot re-run mock test async")
  }
  const runner = createRunner(mockTestState)
  _setTestState(originalTestState)
  async()
  on_tick(() => {
    _setTestState(mockTestState)
    runner.tick()
    if (runner.isDone()) {
      callback(getFirst())
      _setTestState(originalTestState)
      done()
    }
  })
}

describe("setup", () => {
  test("a test", () => {
    test("Hello", () => {
      // noop
    })
    const result = runTestSync()
    assert.not_nil(result)
    assert.equal("Hello", result.name)
    assert.matches("Hello", result.path)
    assert.same(mockTestState.rootBlock, result.parent)
    assert.equal(0, result.indexInParent)
    assert.same([], result.errors)
  })

  test("a describe block", () => {
    describe("Block", () => {
      test("Hello", () => {
        // noop
      })
    })
    const result = runTestSync<DescribeBlock>()
    assert.not_nil(result)
    assert.equal("Block", result.name)
    assert.matches("Block", result.path)
    assert.same(mockTestState.rootBlock, result.parent)
    assert.equal(0, result.indexInParent)

    assert.equal(1, result.children.length)
    const child = result.children[0]
    assert.same(result, child.parent)
    assert.matches("Block > Hello", child.path)
  })

  it("should run tests in order by default", () => {
    describe("Block", () => {
      test("first", () => {
        actions.push(1)
      })
      test("second", () => {
        actions.push(2)
      })
    })

    runTestSync()
    assert.same([1, 2], actions)
  })

  test("cannot nest tests", () => {
    test("Some test", () => {
      test("Nested", () => {
        // noop
      })
    })
    const errors = runTestSync().errors
    assert.are_equal(1, errors.length)
    assert.matches("cannot be nested", errors[0])
  })

  test("cannot nest describe in test", () => {
    test("Some test", () => {
      describe("Nested", () => {
        // noop
      })
    })
    const errors = runTestSync().errors
    assert.are_equal(1, errors.length)
    assert.matches("cannot be nested", errors[0])
  })

  test("empty describe is error", () => {
    describe("empty", () => {
      // nothing
    })
    runTestSync()
    assert.not_same(mockTestState.suppressedErrors, [])
  })
})

describe("hooks", () => {
  test("beforeAll, afterAll", () => {
    before_all(() => {
      actions.push("beforeAll")
    })
    after_all(() => {
      actions.push("afterAll")
    })
    test("test", () => {
      actions.push("test")
    })
    runTestSync()
    assert.are.same(["beforeAll", "test", "afterAll"], actions)
  })

  test("beforeEach, afterEach", () => {
    before_each(() => {
      actions.push("beforeEach")
    })
    after_each(() => {
      actions.push("afterEach")
    })
    test("test", () => {
      actions.push("test")
    })
    runTestSync()
    assert.are_same(["beforeEach", "test", "afterEach"], actions)
  })

  test("finally", () => {
    test("", () => {
      actions.push("test")
      after_test(() => {
        actions.push("afterTest")
      })
    })
    runTestSync()
    assert.same(["test", "afterTest"], actions)
  })

  test("nested", () => {
    before_all(() => actions.push("1 - beforeAll"))
    after_all(() => actions.push("1 - afterAll"))
    before_each(() => actions.push("1 - beforeEach"))
    after_each(() => actions.push("1 - afterEach"))
    test("test1", () => {
      actions.push("1 - test")
      after_test(() => {
        actions.push("1 - afterTest")
      })
    })
    describe("Scoped / Nested scope", () => {
      before_all(() => actions.push("2 - beforeAll"))
      after_all(() => actions.push("2 - afterAll"))
      before_each(() => actions.push("2 - beforeEach"))
      after_each(() => actions.push("2 - afterEach"))
      test("test2", () => actions.push("2 - test"))
    })
    runTestSync()
    assert.are_same(
      [
        "1 - beforeAll",
        "1 - beforeEach",
        "1 - test",
        "1 - afterTest",
        "1 - afterEach",
        "2 - beforeAll",
        "1 - beforeEach",
        "2 - beforeEach",
        "2 - test",
        "2 - afterEach",
        "1 - afterEach",
        "2 - afterAll",
        "1 - afterAll",
      ],
      actions,
    )
  })
})

test("passing test", () => {
  function foo(this: void) {
    assert.are_equal(1, 1)
  }

  before_all(foo)
  before_each(foo)
  after_all(foo)
  after_each(foo)
  test("pass", foo)

  const result = runTestSync()
  assert.are_same([], result.errors)
  assert.are_equal("passed", mockTestState.results.tests[0].result)
})

describe("failing tests", () => {
  after_each(() => {
    assert.are_equal("failed", mockTestState.results.tests[0].result)
  })

  const failMessage = "FAIL: 238472"

  function fail(this: void) {
    error(failMessage)
  }

  test("test", () => {
    test("fail", fail)
    const theTest = runTestSync()
    assert.are_equal(1, theTest.errors.length)
    assert.matches(failMessage, theTest.errors[0], undefined, true)
  })

  test("beforeEach", () => {
    before_each(fail)
    test("test", () => {
      error("Should not have second error")
    })
    const theTest = runTestSync()
    assert.are_equal(1, theTest.errors.length)
    assert.matches(failMessage, theTest.errors[0], undefined, true)
  })
  test("beforeAll", () => {
    before_all(fail)
    test("test", () => {
      error("Should not have second error")
    })
    const theTest = runTestSync()
    assert.are_equal(1, theTest.errors.length)
    assert.matches(failMessage, theTest.errors[0], undefined, true)
  })

  test("afterEach", () => {
    after_each(fail)
    test("test", () => {
      error("first error")
    })
    const theTest = runTestSync()
    assert.are_equal(2, theTest.errors.length)
    assert.matches(failMessage, theTest.errors[1], undefined, true)
  })

  test("afterAll", () => {
    after_all(fail)
    test("test", () => {
      error("first error")
    })
    const theTest = runTestSync()
    assert.are_equal(1, theTest.errors.length)
    assert.matches(failMessage, mockTestState.suppressedErrors[0], undefined, true)
  })

  test("afterTest", () => {
    test("test", () => {
      after_test(fail)
      error("first error")
    })
    const theTest = runTestSync()
    assert.are_equal(2, theTest.errors.length)
    assert.matches(failMessage, theTest.errors[1], undefined, true)
  })

  test("Error stacktrace is clean", () => {
    test("foo", () => {
      error("oh no")
    })
    const t = runTestSync()
    assert.equals(1, t.errors.length)
    // 2 stack frames: the test function, error()
    assert.equals(2, runTestSync().errors[0].split("\n\t").length - 1)
  })
})

describe("skipped tests", () => {
  function setupActionHooks() {
    before_all(() => actions.push("beforeAll"))
    after_all(() => actions.push("afterAll"))
    before_each(() => actions.push("beforeEach"))
    after_each(() => actions.push("afterEach"))
  }

  test("skipped test", () => {
    setupActionHooks()
    test.skip("skipped test", () => {
      actions.push("run")
    })
    const first = runTestSync()
    assert.are_equal("skipped", mockTestState.results.tests[0].result)
    assert.is_same([], first.errors)
    assert.same([], actions, "no actions should be taken on skipped test")
  })

  test("skipped describe", () => {
    setupActionHooks()
    describe.skip("skipped describe", () => {
      test("skipped test", () => {
        actions.push("run")
      })
    })
    const first = runTestSync<DescribeBlock>().children[0] as Test
    assert.are_equal("skipped", mockTestState.results.tests[0].result)
    assert.is_same([], first.errors)
    assert.same([], actions, "no actions should be taken on skipped test")
  })

  test("todo", () => {
    setupActionHooks()
    test.todo("skipped test")
    const first = runTestSync()
    assert.are_equal("todo", mockTestState.results.tests[0].result)
    assert.is_same([], first.errors)
  })

  it("only skips skipped tests", () => {
    test.skip("skipped test", () => {
      actions.push("no")
    })
    test("not skipped test", () => {
      actions.push("yes")
    })
    runTestSync()
    assert.same(["yes"], actions)
  })
})

describe("focused tests", () => {
  test("focused test", () => {
    test.only("should run", () => {
      actions.push("yes")
    })
    test("should not run", () => {
      actions.push("no")
    })
    runTestSync()
    assert.is_true(mockTestState.hasFocusedTests)
    assert.same(["yes"], actions)
  })

  test("focused describe", () => {
    describe.only("should run", () => {
      test("", () => {
        actions.push("yes")
      })
    })
    describe("should not run", () => {
      test("", () => {
        actions.push("no")
      })
    })
    runTestSync()
    assert.is_true(mockTestState.hasFocusedTests)
    assert.same(["yes"], actions)
  })

  it("should still respect skip", () => {
    describe.only("should run", () => {
      test.skip("", () => {
        actions.push("no")
      })
      test("", () => {
        actions.push("yes")
      })
    })
    describe("should not run", () => {
      test("", () => {
        actions.push("no")
      })
    })
    runTestSync()
    assert.is_true(mockTestState.hasFocusedTests)
    assert.same(["yes"], actions)
  })

  test("shallow nested focus", () => {
    describe.only("should run", () => {
      test.only("", () => {
        actions.push("yes1")
      })
      test("", () => {
        actions.push("yes2")
      })
    })
    describe("should not run", () => {
      test("", () => {
        actions.push("no2")
      })
    })
    runTestSync()
    assert.same(["yes1", "yes2"], actions)
  })

  test("skipped describes do not focus", () => {
    describe.skip("func", () => {
      test.only("", () => {
        actions.push("no")
      })
    })
    test("", () => {
      actions.push("yes")
    })
    runTestSync()
    assert.is_false(mockTestState.hasFocusedTests, "should not have focused tests if skipped")
    assert.same(["yes"], actions)
  })
})

describe("async tests", () => {
  test("immediately completed async test", () => {
    test("an async", () => {
      async()
      actions.push("hello")
      done()
    })
    runTestSync()
    assert.same(["hello"], actions)
  })

  describe("timeout", () => {
    test("Test can timeout", () => {
      let tick = 0
      let failedToTimeOut = false
      test("left to timeout", () => {
        async(30)
        on_tick((t) => {
          tick = t
          if (tick > 40) {
            failedToTimeOut = true
            done()
          }
        })
      })
      runTestAsync((test) => {
        assert.is_false(failedToTimeOut, "Test failed to time out.")
        assert.not_same([], test.errors)
        assert.equal(tick, 31)
      })
    })

    it.each([0, -1], "does not accept invalid timeout", (value) => {
      test("Something", () => {
        async(value)
        done()
      })
      runTestAsync((test) => {
        assert.not_same([], test.errors)
      })
    })
  })

  test("async and done can only used during test", () => {
    // already in mock test env
    assert.error(async)
    assert.error(done)
  })

  test("done when not async fails", () => {
    test("should fail", () => {
      done()
    })
    assert.not_same([], runTestSync().errors)
  })

  test("double async fails", () => {
    test("should fail", () => {
      async()
      async()
    })
    assert.not_same([], runTestSync().errors)
  })

  test("double done fails", () => {
    test("should fail", () => {
      async()
      done()
      done()
    })
    runTestAsync((test) => {
      assert.not_same([], test.errors)
    })
  })
})

describe("on_tick", () => {
  test("simple", () => {
    test("an async", () => {
      async()
      on_tick((tick) => {
        actions.push(tick)
        if (tick === 2) {
          done()
        }
      })
    })
    runTestAsync(() => {
      assert.same([1, 2], actions)
    })
  })

  it("can only be used in an async test", () => {
    test("some thing", () => {
      on_tick(() => {
        // noop
      })
    })
    assert.not_same(runTestSync().errors, [])
  })

  it("only runs on the next tick", () => {
    test("an async", () => {
      async()
      on_tick((tick) => {
        actions.push(tick)
      })
      done()
    })
    runTestAsync(() => {
      assert.same([], actions)
    })
  })

  it("stops test on error", () => {
    test("an async", () => {
      async()
      on_tick(() => {
        actions.push("tick")
        error("uh oh")
      })
    })
    runTestAsync((item) => {
      assert.same(["tick"], actions)
      assert.equals(1, item.errors.length)
    })
  })

  it("runs in order registered", () => {
    test("an async", () => {
      async()
      on_tick(() => {
        actions.push(1)
      })
      on_tick((tick) => {
        actions.push(2)
        if (tick === 2) {
          done()
        }
      })
    })
    runTestAsync(() => {
      assert.same([1, 2, 1, 2], actions)
    })
  })

  it("runs even if done", () => {
    test("an async", () => {
      async()
      on_tick(() => {
        done()
      })
      on_tick((tick) => {
        actions.push(tick)
      })
    })
    runTestAsync(() => {
      assert.same([1], actions)
    })
  })

  it("can deregister themselves", () => {
    test("an async", () => {
      async()
      on_tick((tick) => {
        actions.push(tick)
        if (tick === 2) {
          return false
        }
      })
      on_tick((tick) => {
        if (tick === 3) done()
      })
    })
    runTestAsync(() => {
      assert.same([1, 2], actions)
    })
  })

  it("can be added at a later time and not immediately run", () => {
    test("an async", () => {
      async()
      on_tick((t) => {
        if (t === 2) {
          on_tick((t) => {
            actions.push(t)
            if (t === 4) {
              done()
            }
          })
        }
      })
    })
    runTestAsync(() => {
      assert.same([3, 4], actions)
    })
  })
})

describe("after_ticks", () => {
  test("simple", () => {
    let tick: number
    test("an async", () => {
      async()
      on_tick((t) => {
        tick = t
      })
      after_ticks(5, () => {
        done()
      })
    })

    runTestAsync(() => {
      assert.equal(5, tick)
    })
  })

  it("is relative", () => {
    let tick: number
    test("an async", () => {
      async()
      on_tick((t) => {
        tick = t
      })
      after_ticks(2, () => {
        after_ticks(2, () => {
          done()
        })
      })
    })

    runTestAsync(() => {
      assert.equal(4, tick)
    })
  })

  it("only accepts valid arguments", () => {
    test("Some test", () => {
      async()
      after_ticks(-1, () => {
        // noop
      })
    })
    runTestAsync((test) => {
      assert.not_same([], test.errors)
    })
  })
})

describe("multi-part tests", () => {
  test("simple", () => {
    test("some test", () => {
      actions.push(1)
      part(() => {
        actions.push(2)
      })
    })

    runTestSync()
    assert.same([1, 2], actions)
  })

  test("async", () => {
    test("some test", () => {
      async()
      after_ticks(2, () => {
        actions.push(1)
        done()
      })
      part(() => {
        async()
        after_ticks(2, () => {
          actions.push(2)
          done()
        })
      })
    })
    runTestAsync(() => {
      assert.same([1, 2], actions)
    })
  })

  it("clears on_tick between parts", () => {
    test("some test", () => {
      async()
      on_tick((tick) => {
        actions.push(tick)
      })
      after_ticks(2, done)
      part(() => {
        async()
        after_ticks(3, () => {
          actions.push("done")
          done()
        })
      })
    })
    runTestAsync(() => {
      assert.same([1, 2, "done"], actions)
    })
  })

  test("error stops multi-part test", () => {
    test("some test", () => {
      error("oh no")
      part(() => {
        actions.push("should not run")
      })
    })
    runTestSync()
    assert.same([], actions)
  })
})

describe("ticks between tests", () => {
  test("simple", () => {
    let tick1 = 0
    let tick2 = 0
    let tick3 = 0
    ticks_between_tests(2)
    test("1", () => {
      tick1 = game.tick
    })

    test("2", () => {
      tick2 = game.tick
    })

    test("3", () => {
      tick3 = game.tick
    })
    runTestAsync(() => {
      assert.equals(2, tick2 - tick1)
      assert.equals(2, tick3 - tick2)
    })
  })

  it("is local and inherited", () => {
    let tick1 = 0
    let tick2 = 0
    let tick3 = 0
    let tick4 = 0
    let tick5 = 0
    ticks_between_tests(2)
    describe("nested", () => {
      test("1", () => {
        tick1 = game.tick
      })

      test("2", () => {
        tick2 = game.tick
      })

      ticks_between_tests(3)

      test("3", () => {
        tick3 = game.tick
      })
    })

    test("4", () => {
      tick4 = game.tick
    })

    ticks_between_tests(0)
    test("5", () => {
      tick5 = game.tick
    })

    runTestAsync(() => {
      assert.equals(2, tick2 - tick1)
      assert.equals(3, tick3 - tick2)
      assert.equals(2, tick4 - tick3)
      assert.equals(0, tick5 - tick4)
    })
  })

  it("does not accept negative value", () => {
    assert.error(() => {
      ticks_between_tests(-1)
    })
  })
})

describe.each(["test", "describe"], "%s.each", (funcName) => {
  const creator = funcName === "test" ? test : describe
  test("single values", () => {
    const values = [1, 2, 3, 4]
    creator.each(values, "an each test", (value) => {
      actions.push(value)
    })
    runTestSync()
    assert.same(values, actions)
  })

  test("many values", () => {
    const values = [
      [1, 2, "corn"],
      [4, "3", 2],
      [3, { table: "thing" }, 4],
    ]
    creator.each(values, "an each test", (...values) => {
      actions.push(values)
    })
    runTestSync()
    assert.same(values, actions)
  })

  test("number title format", () => {
    const values = [
      [1, 2, 3],
      [4, 3, 2],
      [3, 3, 4],
    ]
    const title = "%d, %d, %d"
    creator.each(values, title, (...values) => {
      actions.push(values)
    })
    runTestSync()
    assert.same(values, actions)
    const titles = mockTestState.rootBlock.children.map((x) => x.name)
    assert.same(
      values.map((v) => string.format(title, ...v)),
      titles,
    )
  })

  test("object title format", () => {
    creator.each([{ prop: "value" }], "%s", () => {
      // nothing
    })
    const item = runTestSync()
    assert.equals('{prop = "value"}', item.name)
  })
})

describe("reload state", () => {
  function reloadAndTick(): void {
    const runner = createRunner(mockTestState)
    runner.tick()
  }

  // would also check for uninitialized, but that requires too deep a level of meta

  test("Reload state lifecycle", () => {
    assert.equal(TestStage.NotRun, mockTestState.getTestStage())
    test("", () => {
      // empty
    })
    const runner = createRunner(mockTestState)
    assert.equal(TestStage.Running, mockTestState.getTestStage())
    runner.tick()
    assert.equal(TestStage.Completed, mockTestState.getTestStage())
  })

  test("Cannot reload while testing", () => {
    test("Test 1", () => {
      async()
    })
    reloadAndTick()
    assert.same(mockTestState.suppressedErrors, [])
    reloadAndTick()
    assert.not_same(mockTestState.suppressedErrors, [])
    assert.equal(TestStage.LoadError, mockTestState.getTestStage())
  })

  test.each([TestStage.LoadError], "should not run with state %s", (state) => {
    mockTestState.setTestStage(state)
    assert.error(() => {
      createRunner(mockTestState)
    })
  })
})

describe("test events", () => {
  test("Full lifecycle", () => {
    describe("block", () => {
      test("test", () => {
        //noop
      })
    })
    runTestSync()
    const expected: TestEvent["type"][] = [
      "startTestRun",
      "enterDescribeBlock", // root
      "enterDescribeBlock",
      "testStarted",
      "testPassed",
      "exitDescribeBlock",
      "exitDescribeBlock",
      "finishTestRun",
    ]
    assert.same(
      expected,
      events.map((x) => x.type),
    )
  })
  test("failing", () => {
    test("test", () => {
      error("on no")
    })
    runTestSync()
    const expected: TestEvent["type"][] = [
      "startTestRun",
      "enterDescribeBlock",
      "testStarted",
      "testFailed",
      "exitDescribeBlock",
      "finishTestRun",
    ]
    assert.same(
      expected,
      events.map((x) => x.type),
    )
  })
  test("skipped", () => {
    test.skip("test", () => {
      // noop
    })
    runTestSync()
    const expected: TestEvent["type"][] = [
      "startTestRun",
      "enterDescribeBlock",
      "testStarted",
      "testSkipped",
      "exitDescribeBlock",
      "finishTestRun",
    ]
    assert.same(
      expected,
      events.map((x) => x.type),
    )
  })
  test("todo", () => {
    test.todo("todo")
    runTestSync()
    const expected: TestEvent["type"][] = [
      "startTestRun",
      "enterDescribeBlock",
      "testStarted",
      "testTodo",
      "exitDescribeBlock",
      "finishTestRun",
    ]
    assert.same(
      expected,
      events.map((x) => x.type),
    )
  })
})

test("Test pattern", () => {
  mockTestState.config = {
    test_pattern: "foo",
  }
  test("bar", () => {
    actions.push("no")
  })
  test("a foo test", () => {
    actions.push("yes1")
  })
  describe("foo", () => {
    test("yes", () => {
      actions.push("yes2")
    })
  })
  runTestSync()
  assert.are_same(["yes1", "yes2"], actions)
})