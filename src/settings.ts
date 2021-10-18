import { Data } from "typed-factorio/settings/types"
import { ReloadedForTest, ScenarioTestMod } from "./constants"

declare const data: Data

data.extend([
  {
    type: "string-setting",
    setting_type: "runtime-global",
    name: ScenarioTestMod,
    hidden: true,
    default_value: "",
    allow_blank: true,
  },
  {
    type: "bool-setting",
    setting_type: "runtime-global",
    name: ReloadedForTest,
    hidden: true,
    default_value: false,
  },
])
