if (script.active_mods.testorio) {
  require("__testorio__/init")(["test1", "folder/test2", "folder/inWorld"], {
    tag_blacklist: ["no"],
  })
}
