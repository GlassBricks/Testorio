import { logListener } from "./output"
import { resultCollector } from "./result"
import { TestListener } from "./testEvents"

const setupListener: TestListener = (event, state) => {
  if (event.type === "testRunStarted") {
    game.speed = state.config.game_speed
    game.autosave_enabled = false
    state.config.before_test_run?.()
  } else if (event.type === "testRunFinished") {
    game.speed = 1
    state.config.after_test_run?.()
  }
}

export const builtinTestListeners: TestListener[] = [resultCollector, setupListener, logListener]
