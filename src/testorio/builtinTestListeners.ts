import { logListener } from "./output"
import { resultCollector } from "./result"
import { TestState } from "./state"
import { TestEvent, TestListener } from "./testEvents"

export function setupListener(event: TestEvent, state: TestState): void {
  if (event.type === "testRunStarted") {
    game.speed = state.config.game_speed
    game.autosave_enabled = false
  } else if (event.type === "testRunFinished") {
    game.speed = 1
  }
}

export const builtinTestListeners: TestListener[] = [resultCollector, setupListener, logListener]
