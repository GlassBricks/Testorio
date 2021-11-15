import "./remote"
import "./control/index"

// Only load self-tests when testorio-test-mod is also present
// so users get less confused
if (script.active_mods["__testorio-test-mod"]) {
  require("@NoResolution:__testorio__/init")(["testorio/test/meta.test.lua", "testorio/test/reload.test.lua"], {
    default_ticks_between_tests: 1,
  })
}
