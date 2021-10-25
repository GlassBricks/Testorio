import "../luassert"
import { createRunner, TestRunner } from "./runner"
import {
  getTestState,
  globals,
  resetTestState,
  TestState,
} from "./stateAndSetup"
import { ReloadState } from "../constants"

export = function init(...files: string[]): void {
  const testState = loadTests(...files)
  const reloadState = testState.getReloadState()

  switch (reloadState) {
    case ReloadState.Uninitialized:
    case ReloadState.Loaded: {
      testState.setReloadState(ReloadState.Loaded)
      // only run when NOT in map editor
      addOnEvent(defines.events.on_game_created_from_scenario, runTests)
      break
    }
    case ReloadState.Running:
    case ReloadState.ToReload:
      runTests()
      break
    case ReloadState.Completed:
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
  function prepareRun() {
    if (game.is_multiplayer()) {
      error("Tests cannot be in run in multiplayer")
    }
    game.speed = 1000
    game.autosave_enabled = false
    game.disable_replay()
  }
  function finishRun() {
    game.speed = 1
    revertOnTick()
  }
  const revertOnTick = addOnEvent(defines.events.on_tick, () => {
    if (!runner) {
      runner = createRunner(getTestState())
      prepareRun()
    }
    runner.tick()
    if (runner.isDone()) {
      runner.reportResult()
      finishRun()
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
