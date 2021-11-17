import "__testorio__/luassert/init"
import { createRunner, TestRunner } from "./runner"
import { getTestState, resetTestState, TestState } from "./state"
import { Remote, TestStage } from "../shared-constants"
import { globals } from "./setup"
import { addTestListeners } from "./testEvents"
import { builtinTestListeners } from "./builtinTestListeners"
import { progressGuiListener, progressGuiLogger } from "./progressGui"
import { addLogHandler, debugAdapterEnabled, debugAdapterLogger, gameLogger, LogLevel, setLogLevel } from "./log"
import { assertNever } from "./util"
import { fillConfig } from "./config"
import _require_ = require("./require/_require_")
import Config = Testorio.Config

export function load(this: unknown, files: string[], config: Partial<Config>): void {
  loadTests(files, config)
  remote.add_interface(Remote.RunTests, { runTests, modName: () => script.mod_name })
  addOnEvent(defines.events.on_game_created_from_scenario, runTests)
  addOnEvent(defines.events.on_tick, tryContinueTests)
}

function loadTests(files: string[], partialConfig: Partial<Config>): TestState {
  const config = fillConfig(partialConfig)
  Object.assign(globalThis, globals)
  resetTestState(config)
  const state = getTestState()

  ticks_between_tests(config.default_ticks_between_tests)
  for (const file of files) {
    describe(file, () => {
      _require_(file)
    })
  }
  state.currentBlock = undefined
  return state
}

addTestListeners(...builtinTestListeners)

function tryContinueTests() {
  const testStage = getTestState().getTestStage()
  if (testStage === TestStage.Running || testStage === TestStage.ToReload) {
    runTests()
  } else {
    revertPatchedEvents()
  }
}

function runTests() {
  log("Running tests")
  let runner: TestRunner | undefined
  if (game) game.tick_paused = false

  const state = getTestState()
  const { config } = state
  if (config.show_progress_gui) {
    addTestListeners(progressGuiListener)
    addLogHandler(progressGuiLogger)
  }
  if (config.log_to_game) {
    addLogHandler(gameLogger)
  }
  if (config.log_to_DA && debugAdapterEnabled) {
    addLogHandler(debugAdapterLogger)
  }
  if (config.log_to_log || (config.log_to_DA && !debugAdapterEnabled)) {
    addLogHandler((_, message) => {
      log(message)
    })
  }
  if (config.log_level === "trace") {
    setLogLevel(LogLevel.Trace)
  } else if (config.log_level === "debug") {
    setLogLevel(LogLevel.Debug)
  } else if (config.log_level === "basic") {
    setLogLevel(LogLevel.Info)
  } else {
    assertNever(config.log_level)
  }

  config.before_test_run?.()
  addOnEvent(defines.events.on_tick, () => {
    if (!runner) {
      runner = createRunner(state)
    }
    runner.tick()
    if (runner.isDone()) {
      revertPatchedEvents()
      config.after_test_run?.()
    }
  })
}

const patchedHandlers: Record<defines.Events, [handler?: (data: any) => void]> = {}
let scriptPatched = false
const oldOnEvent = script.on_event

function addOnEvent(event: defines.Events, func: () => void) {
  if (!patchedHandlers[event]) {
    patchedHandlers[event] = [script.get_event_handler(event)]
  }

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
}

function revertPatchedEvents() {
  script.on_event = oldOnEvent
  for (const [event, handler] of pairs(patchedHandlers)) {
    delete patchedHandlers[event]
    script.on_event(event, handler[0])
  }
}
