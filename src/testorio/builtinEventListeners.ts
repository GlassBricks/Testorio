import { TestEvent, TestListener } from "./testEvents"
import { loggingListener } from "./log"
import { resultCollector } from "./result"
import { TestState } from "./state"

export function setupListener(event: TestEvent, state: TestState): void {
  if (event.type === "startTestRun") {
    log("Ticks played: " + game.ticks_played)
    game.speed = state.config.game_speed ?? 1000
    game.autosave_enabled = false
  } else if (event.type === "finishTestRun") {
    game.speed = 1
  }
}

export const builtinTestListeners: TestListener[] = [resultCollector, setupListener, loggingListener]
