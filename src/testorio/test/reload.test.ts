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

test("after_mod_reload", () => {
  global.foo = () => 0 // can't be serialized
  someValue = "changed"
  // this function holds a reference to "refValue" as an upvalue
  // this reference should be dropped during reload, i.e. this function should not be saved in global
  // otherwise this may cause problems if a table is made weak during on_load: the reference is no longer valid,
  // and so the global table is changed, causing an error
  global.weakTable = setmetatable({ value: refValue }, { __mode: "v" })
}).after_mod_reload(() => {
  assert.is_nil(global.foo)
  assert.equal("initial", someValue)
  assert.equal(getTestState().getTestStage(), TestStage.Running)

  assert.is_nil(global.weakTable.value)
})
