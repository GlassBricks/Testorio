import { Remote, Settings } from "./constants"

let initCalled = false
export = function init(...files: string[]): void {
  if (initCalled) {
    error("Duplicate call to test init")
  }
  initCalled = true
  remote.add_interface(Remote.TestsAvailableFor + script.mod_name, {})
  if (script.mod_name !== settings.global[Settings.TestMod].value) {
    return
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ;(require("./tests/load") as typeof import("./tests/load")).load(...files)
}
