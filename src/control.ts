import "./control/index"

// Only load self-tests when testorio-test-mod is also present
// so users get less confused
if (script.active_mods["__testorio-test-mod"]) {
  require("__testorio__/init")(["test.meta.test", "test.reload.test"], {
    sound_effects: true,
  })
}
