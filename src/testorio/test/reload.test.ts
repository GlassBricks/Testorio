import { TestStage } from "../../shared-constants"
import { getTestState } from "../state"

declare const global: {
  foo?: () => 0
  weakTable: {
    value: unknown
  }
}

let someValue = "initial"

const refValue = {}

// this function holds a reference to "refValue" as an upvalue
// this reference should be dropped during reload, i.e. this function should not be saved in global
// otherwise this may cause problems when using weak tables in global: the value is saved as it is still referenced
// by the function. However, during load, the value is no longer referenced, so when making the table weak during
// on_load the global table will change, causing an error.

// multiple tests in one, as reload is slow
test("after_mod_reload", () => {
  someValue = "changed"

  global.foo = () => 0 // can't be serialized

  global.weakTable = setmetatable({ value: refValue }, { __mode: "v" })
}).after_mod_reload(() => {
  assert.equal(getTestState().getTestStage(), TestStage.Running)

  assert.equal("initial", someValue)

  assert.is_nil(global.foo)

  assert.is_nil(global.weakTable.value)
})
