import { ProtoNames } from "./constants"

let initCalled = false
export = function init(...files: string[]): void {
  if (initCalled) {
    error("Duplicate call to test init")
  }
  initCalled = true
  if (script.mod_name !== settings.global[ProtoNames.LoadTestsFor].value) {
    return
  }
  const modNameWorkaround = "tests/init"
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ;(require(modNameWorkaround) as typeof import("./tests/init"))(...files)
}
