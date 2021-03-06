import { logListener } from "./output"
import { resultCollector } from "./result"
import { TestListener } from "./testEvents"
import { cleanupTestState } from "./state"

const setupListener: TestListener = (event, state) => {
  if (event.type === "testRunStarted") {
    game.speed = state.config.game_speed
    game.autosave_enabled = false
    state.config.before_test_run?.()
  } else if (event.type === "testRunFinished") {
    game.speed = 1
    if (state.config.sound_effects) {
      const passed = state.results.status === "passed" || state.results.status === "todo"
      if (passed) {
        game.play_sound({ path: "utility/game_won" })
      } else {
        game.play_sound({ path: "utility/game_lost" })
      }
    }
    state.config.after_test_run?.()
    cleanupTestState()
  } else if (event.type === "loadError") {
    game.speed = 1
    game.play_sound({ path: "utility/console_message" })
  }
}

export const builtinTestListeners: TestListener[] = [resultCollector, setupListener, logListener]
