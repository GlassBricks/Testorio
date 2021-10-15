// eslint-disable-next-line import/no-unresolved
import "luassert"
import { createRunner, TestRunner } from "./runner"
import { getTestState, resetTestState, setup } from "./setup"

declare global {
  const describe: typeof setup.describe
  const test: typeof setup.test
  const it: typeof setup.it
  const beforeAll: typeof setup.beforeAll
  const afterAll: typeof setup.afterAll
  const beforeEach: typeof setup.beforeEach
  const afterEach: typeof setup.afterEach

  const async: typeof setup.async
  const done: typeof setup.done
  const on_tick: typeof setup.on_tick
  const after_ticks: typeof setup.after_ticks
  const ticks_between_tests: typeof setup.ticks_between_tests
}
Object.assign(globalThis, setup)

export = function init(...files: string[]): void {
  // setup
  resetTestState()
  for (const file of files) {
    describe(file, () => {
      require(file)
    })
  }
  getTestState().currentBlock = undefined

  // todo: talk to DA
  // todo: make this more resilient to conditional event handlers
  const previousOnTick = script.get_event_handler(defines.events.on_tick)

  script.on_event(defines.events.on_tick, (data) => {
    previousOnTick?.(data)
    testTick()
  })

  let runner: TestRunner | undefined

  function testTick(): void {
    if (!runner) {
      runner = createRunner(getTestState())
      game.speed = 1000
    }
    runner.tick()
    if (runner.isDone()) {
      runner.reportResult()
      script.on_event(defines.events.on_tick, previousOnTick)

      game.speed = 1
    }
  }
}
