import "./scenarioTools/make-test-scenario"
import "./scenarioTools/enablerTool"
import init = require("./init")

init("test/meta.test.lua", "test/inWorld.test.lua", "test/reload.test.lua")
