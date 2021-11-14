import { Data } from "typed-factorio/settings/types"
import { TestStage } from "./shared-constants"
import { Settings, TestStageValues } from "./constants"

declare const data: Data

data.extend([
  {
    type: "string-setting",
    setting_type: "runtime-global",
    name: Settings.TestMod,
    default_value: "",
    allow_blank: true,
  },
  {
    type: "string-setting",
    setting_type: "runtime-global",
    name: Settings.TestStage,
    allowed_values: TestStageValues,
    default_value: TestStage.NotRun,
  },
])
