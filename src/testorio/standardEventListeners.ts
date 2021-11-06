import { TestEvent, TestListener } from "./testEvents"
import { logListener } from "./log"
import { resultCollector } from "./result"

export function setupListener(event: TestEvent): void {
  if (event.type === "startTestRun") {
    game.speed = 1000
    game.autosave_enabled = false
  } else if (event.type === "finishTestRun") {
    game.speed = 1
  }
}

export const standardTestListeners: TestListener[] = [setupListener, resultCollector, logListener]
