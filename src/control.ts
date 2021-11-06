import "./control/index"
import init = require("./init")

init(["test/meta.test.lua", "test/reload.test.lua", "test/inWorld.test.lua"], {
  default_ticks_between_tests: 1,
})
