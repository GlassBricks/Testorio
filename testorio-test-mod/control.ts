if (script.active_mods.testorio) {
  require("__testorio__/init")(["test1", "folder/test2"], {
    log_level: "trace",
  })
}
