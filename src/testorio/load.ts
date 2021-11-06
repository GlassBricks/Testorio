import "../luassert"
import { createRunner, TestRunner } from "./runner"
import { getTestState, resetTestState, TestState } from "./state"
import { Remote, TestStage } from "../constants"
import { globals } from "./setup"
import { addTestListeners } from "./testEvents"
import { builtinTestListeners } from "./builtinEventListeners"
import { progressGuiListener, progressGuiLogHandler } from "./progressGui"
import { addLogHandlers, debugAdapterEnabled, debugAdapterLogger, gameLogger, LogLevel, setLogLevel } from "./log"
import Config = Testorio.Config

export function load(files: string[], config: Config): void {
  const testState = loadTests(files, config)
  const testStage = testState.getTestStage()

  switch (testStage) {
    case TestStage.NotRun: {
      addOnEvent(defines.events.on_game_created_from_scenario, runTests)
      remote.add_interface(Remote.RunTests, { runTests, modName: () => script.mod_name })
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

function loadTests(files: string[], config: Config): TestState {
  Object.assign(globalThis, globals)
  resetTestState(config)
  const state = getTestState()
  const modName = `__${script.mod_name}__`

  if (config.default_ticks_between_tests) {
    ticks_between_tests(config.default_ticks_between_tests)
  }
  for (let file of files) {
    if (file.includes("/") && !file.startsWith(modName)) {
      file = `${modName}/${file}`
    }
    describe(file, () => {
      require(file)
    })
  }
  state.currentBlock = undefined
  return state
}

addTestListeners(...builtinTestListeners)
function runTests() {
  let runner: TestRunner | undefined
  if (game) game.tick_paused = false

  const state = getTestState()
  const { config } = state
  if (config.show_progress_gui !== false) {
    addTestListeners(progressGuiListener)
    addLogHandlers(progressGuiLogHandler)
  } else {
    addLogHandlers(gameLogger)
  }
  if (debugAdapterEnabled) {
    addLogHandlers(debugAdapterLogger)
  } else {
    addLogHandlers((_, message) => {
      log(message)
    })
  }
  if (config.verbose) {
    setLogLevel(LogLevel.Trace)
  } else if (debugAdapterEnabled) {
    setLogLevel(LogLevel.Debug)
  } else {
    setLogLevel(LogLevel.Info)
  }

  config.before_test_run?.()
  const revertOnTick = addOnEvent(defines.events.on_tick, () => {
    if (!runner) {
      runner = createRunner(state)
    }
    runner.tick()
    if (runner.isDone()) {
      revertOnTick()
      config.after_test_run?.()
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
