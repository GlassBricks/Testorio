import { Data } from "typed-factorio/settings/types"
import { ProtoNames, ReloadState } from "./constants"

declare const data: Data

data.extend([
  {
    type: "string-setting",
    setting_type: "runtime-global",
    name: ProtoNames.LoadTestsFor,
    hidden: true,
    default_value: "",
    allow_blank: true,
  },
  {
    type: "string-setting",
    setting_type: "runtime-global",
    name: ProtoNames.ReloadState,
    hidden: true,
    allowed_values: Object.values(ReloadState),
    default_value: ReloadState.Uninitialized,
  },
])
