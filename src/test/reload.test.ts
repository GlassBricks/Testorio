import { getTestState } from "../testorio/state"
import { TestStage } from "../constants"

declare const global: {
  foo?: () => 0
}

let someValue = "initial"

test("after_mod_reload", () => {
  global.foo = () => 0 // can't be serialized
  someValue = "changed"
}).after_mod_reload(() => {
  assert.is_nil(global.foo)
  assert.equal("initial", someValue)
  assert.equal(getTestState().getTestStage(), TestStage.Running)
})
