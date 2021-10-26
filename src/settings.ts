import { Data } from "typed-factorio/settings/types"
import { ReloadState, ReloadStateValues, Settings } from "./constants"

declare const data: Data

data.extend([
  {
    type: "string-setting",
    setting_type: "runtime-global",
    name: Settings.LoadTestsFor,
    hidden: true,
    default_value: "",
    allow_blank: true,
  },
  {
    type: "string-setting",
    setting_type: "runtime-global",
    name: Settings.ReloadState,
    hidden: true,
    allowed_values: ReloadStateValues,
    default_value: ReloadState.Uninitialized,
  },
])
