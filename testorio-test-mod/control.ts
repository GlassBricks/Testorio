if (script.active_mods.testorio) {
  require("__testorio__/init")(["test1", "folder/test2", "folder/inWorld"], {
    tag_blacklist: ["no"],
    log_passed_tests: true,
    log_skipped_tests: true,
    sound_effects: true,
  })
  if (settings.global["testorio:test-mod"].value === script.mod_name) {
    script.on_event(defines.events.on_tick, () => {
      script.on_event(defines.events.on_tick, undefined)
      remote.call("testorio", "runTests")
    })
  }
}
