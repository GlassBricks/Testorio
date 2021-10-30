import "../luassert"
import { createRunner, TestRunner } from "./runner"
import { getTestState, resetTestState, TestState } from "./state"
import { Remote, TestStage } from "../constants"
import { globals } from "./setup"

export function load(...files: string[]): void {
  const testState = loadTests(...files)
  const testStage = testState.getTestStage()

  switch (testStage) {
    case TestStage.NotRun: {
      addOnEvent(defines.events.on_game_created_from_scenario, runTests)
      remote.add_interface(Remote.RunTests, { runTests })
      break
    }
    case TestStage.Running:
    case TestStage.ToReload:
      runTests()
      break
    case TestStage.Completed:
      break
  }
}

function loadTests(...files: string[]): TestState {
  Object.assign(globalThis, globals)
  resetTestState()
  const modName = `__${script.mod_name}__`

  for (let file of files) {
    if (file.includes("/") && !file.startsWith(modName)) {
      file = `${modName}/${file}`
    }
    describe(file, () => {
      require(file)
    })
  }
  const state = getTestState()
  state.currentBlock = undefined
  return state
}

function runTests() {
  let runner: TestRunner | undefined
  if (game) game.tick_paused = false
  const revertOnTick = addOnEvent(defines.events.on_tick, () => {
    if (!runner) {
      runner = createRunner(getTestState())
    }
    runner.tick()
    if (runner.isDone()) {
      runner.reportResult()
      game.speed = 1
      revertOnTick()
    }
  })
}

const patchedHandlers: Record<defines.Events, [handler?: (data: any) => void]> = {}
let scriptPatched = false
const oldOnEvent = script.on_event

type Revert = () => void

function addOnEvent(event: defines.Events, func: () => void): Revert {
  patchedHandlers[event] = [script.get_event_handler(event)]

  oldOnEvent(event, (data) => {
    patchedHandlers[event][0]?.(data)
    func()
  })

  if (!scriptPatched) {
    scriptPatched = true

    script.on_event = (event: any, func: any) => {
      const handler = patchedHandlers[event]
      if (handler) {
        handler[0] = func
      } else {
        oldOnEvent(event, func)
      }
    }
  }

  return () => {
    const handler = patchedHandlers[event][0]
    delete patchedHandlers[event]
    oldOnEvent(event, handler)
  }
}
