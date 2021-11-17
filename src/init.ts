// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../testorio.d.ts" />
import Config = Testorio.Config

let initCalled = false
function init(this: void, files: string[], config?: Partial<Config>): void
function init(
  this: void,
  a: string[] | undefined,
  b: string[] | Partial<Config> | undefined,
  c?: Partial<Config>,
): void {
  const files = (a ?? b ?? error("Files must be specified")) as string[]
  const config = ((a ? b : c) ?? {}) as Config
  if (initCalled) {
    error("Duplicate call to test init")
  }
  initCalled = true
  remote.add_interface("testorio-tests-available-for-" + script.mod_name, {})
  if (script.mod_name === settings.global["testorio:test-mod"].value) {
    require("@NoResolution:__testorio__/testorio/load").load(files, config)
  }
}

export = init
