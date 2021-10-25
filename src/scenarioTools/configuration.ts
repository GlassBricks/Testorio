import { ProtoNames } from "../constants"

commands.add_command(
  "make-test-scenario",
  ["testorio:make-test-scenario"],
  (data) => {
    const modName = data.parameter
    const print = data.player_index
      ? game.players[data.player_index].print
      : game.print
    if (!modName || !string.match(modName, "[%w%-_]+")) {
      print(["testorio:no-mod-name-specified"])
      return
    }
    if (!string.match(modName, "[%w%-_]+")) {
      print(["testorio:invalid-mod-name-specified"])
      return
    }
    settings.global[ProtoNames.LoadTestsFor] = {
      value: modName,
    }
    if (modName === "-") {
      game.print(["testorio:tests-disabled"])
    } else {
      game.print(["testorio:tests-enabled", modName])
      if (!script.active_mods[modName]) {
        game.print(["testorio:mod-not-enabled", modName], [255, 140, 20])
      }
    }
  },
)
