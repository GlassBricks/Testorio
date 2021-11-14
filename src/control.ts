import "./remote"
import "./control/index"

const init = require("@NoResolution:__testorio__/init")

init(["testorio/test/meta.test.lua", "testorio/test/reload.test.lua", "testorio/test/inWorld.test.lua"], {
  default_ticks_between_tests: 1,
})
