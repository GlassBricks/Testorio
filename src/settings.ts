import { Data } from "typed-factorio/settings/types"
import { Settings, TestStage, TestStageValues } from "./constants"

declare const data: Data

data.extend([
  {
    type: "string-setting",
    setting_type: "runtime-global",
    name: Settings.TestMod,
    hidden: true,
    default_value: "",
    allow_blank: true,
  },
  {
    type: "string-setting",
    setting_type: "runtime-global",
    name: Settings.TestStage,
    hidden: true,
    allowed_values: TestStageValues,
    default_value: TestStage.NotRun,
  },
])
