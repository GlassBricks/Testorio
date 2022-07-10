import "./control/index"
import { Settings } from "./constants"

// Only load self-tests when testorio-test-mod is also present
// so users get less confused
if (script.active_mods["__testorio-test-mod"]) {
  require("__testorio__/init")(["test.meta.test", "test.reload.test"], {
    sound_effects: true,
    after_test_run() {
      const results = remote.call("testorio", "getResults")
      if (results.status === "passed") {
        settings.global[Settings.TestMod] = { value: "__testorio-test-mod" }
        game.reload_mods()
      }
    },
  })
}
