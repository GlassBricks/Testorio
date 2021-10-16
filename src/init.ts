// eslint-disable-next-line import/no-unresolved
import "luassert"
import { createRunner, TestRunner } from "./runner"
import { getTestState, resetTestState, globals } from "./setup"

Object.assign(globalThis, globals)

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
