import "__testorio__/luassert/init"
import { Remote, TestStage } from "../shared-constants"
import { debugAdapterEnabled } from "./_util"
import { builtinTestListeners } from "./builtinTestListeners"
import { fillConfig } from "./config"
import { addLogHandler, debugAdapterLogger, gameLogger, logLogger } from "./output"
import { progressGuiListener, progressGuiLogger } from "./progressGui"
import { createTestRunner, TestRunner } from "./runner"
import { globals } from "./setup"
import { getTestState, onTestStageChanged, resetTestState } from "./state"
import { addTestListener } from "./testEvents"
import Config = Testorio.Config

declare const ____originalRequire: typeof require

// noinspection JSUnusedGlobalSymbols
export function loadTestorio(this: unknown, files: string[], config: Partial<Config>): void {
  loadTests(files, config)
  remote.add_interface(Remote.Testorio, {
    runTests,
    modName: () => script.mod_name,
    getTestStage: () => getTestState().getTestStage(),
    fireCustomEvent: (name, data) => {
      getTestState().raiseTestEvent({
        type: "customEvent",
        name,
        data,
      })
    },
    onTestStageChanged: () => onTestStageChanged,
    getResults: () => getTestState().results,
  })
  tapEvent(defines.events.on_game_created_from_scenario, runTests)
  tapEvent(defines.events.on_tick, tryContinueTests)
}

function loadTests(files: string[], partialConfig: Partial<Config>): void {
  const config = fillConfig(partialConfig)

  // load globals
  const defineGlobal = __DebugAdapter?.defineGlobal
  for (const [key, value] of pairs(globals)) {
    defineGlobal?.(key)
    ;(globalThis as any)[key] = value
  }

  resetTestState(config)
  const state = getTestState()

  // load files
  const _require = settings.global["testorio:test-mod"].value === "testorio" ? require : ____originalRequire
  for (const file of files) {
    describe(file, () => _require(file))
  }
  state.currentBlock = undefined
}

function tryContinueTests() {
  const testStage = getTestState().getTestStage()
  if (testStage === TestStage.Running || testStage === TestStage.ToReload) {
    runTests()
  } else {
    revertPatchedEvents()
  }
}

function runTests() {
  log(`Running tests for ${script.mod_name}`)

  builtinTestListeners.forEach(addTestListener)
  if (game) game.tick_paused = false

  const state = getTestState()
  const { config } = state
  if (config.show_progress_gui) {
    addTestListener(progressGuiListener)
    addLogHandler(progressGuiLogger)
  }
  if (config.log_to_game) {
    addLogHandler(gameLogger)
  }
  if (config.log_to_DA && debugAdapterEnabled) {
    addLogHandler(debugAdapterLogger)
  }
  if (config.log_to_log || (config.log_to_DA && !debugAdapterEnabled)) {
    addLogHandler(logLogger)
  }

  let runner: TestRunner | undefined
  tapEvent(defines.events.on_tick, () => {
    if (!runner) {
      runner = createTestRunner(state)
    }
    runner.tick()
    if (runner.isDone()) {
      revertPatchedEvents()
    }
  })
}

const patchedHandlers: Record<defines.Events, [handler?: (data: any) => void]> = {}
let onEventIntercepted = false
const oldOnEvent = script.on_event

function tapEvent(event: defines.Events, func: () => void) {
  if (!patchedHandlers[event]) {
    patchedHandlers[event] = [script.get_event_handler(event)]
  }

  oldOnEvent(event, (data) => {
    patchedHandlers[event][0]?.(data)
    func()
  })

  if (!onEventIntercepted) {
    onEventIntercepted = true

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
