import "../luassert"
import { createRunner, TestRunner } from "./runner"
import { getTestState, globals, resetTestState } from "./setup"
import { ReloadedForTest, ScenarioTestMod } from "../constants"

let initialized = false
export = function init(...files: string[]): void {
  if (initialized) {
    error("Duplicate call to test init")
  }
  initialized = true
  if (script.mod_name !== settings.global[ScenarioTestMod].value) {
    return
  }
  loadTests(...files)
  if (settings.global[ReloadedForTest].value) {
    runTests()
  } else {
    // only run when NOT in map editor
    addOnEvent(defines.events.on_game_created_from_scenario, runTests)
  }
}

function loadTests(...files: string[]) {
  Object.assign(globalThis, globals)
  resetTestState()
  const modName = `__${script.mod_name}__`

  let i = 0
  if (!files[0]) i++
  while (true) {
    let file = files[i]
    if (!file) break
    if (file.includes("/") && !file.startsWith(modName)) {
      file = `${modName}/${file}`
    }
    describe(file, () => {
      require(file)
    })
    i++
  }
  getTestState().currentBlock = undefined
}

function runTests() {
  let runner: TestRunner | undefined
  const revertOnTick = addOnEvent(defines.events.on_tick, () => {
    if (!runner) {
      runner = createRunner(getTestState())
      game.speed = 1000
      game.autosave_enabled = false
      game.disable_replay()
    }
    runner.tick()
    if (runner.isDone()) {
      runner.reportResult()

      game.speed = 1
      game.tick_paused = true
      revertOnTick()
    }
  })
}

const patchedEvents: Record<defines.events, [handler?: (data: any) => void]> =
  {}
let scriptPatched = false
const oldOnEvent = script.on_event

type Revert = () => void

function addOnEvent(event: defines.events, func: () => void): Revert {
  const handler = (patchedEvents[event] = [script.get_event_handler(event)])

  oldOnEvent(event, (data) => {
    handler[0]?.(data)
    func()
  })

  if (!scriptPatched) {
    scriptPatched = true

    script.on_event = (event: any, func: any) => {
      if (event in patchedEvents) {
        handler[0] = func
      } else {
        oldOnEvent(event, func)
      }
    }
  }

  return () => {
    delete patchedEvents[event]
    oldOnEvent(event, handler[0])
  }
}
