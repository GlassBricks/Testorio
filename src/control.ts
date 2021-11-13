import "./control/index"

const init = require("__testorio__/init")

init(["test/meta.test.lua", "test/reload.test.lua", "test/inWorld.test.lua"], {
  default_ticks_between_tests: 1,
})
