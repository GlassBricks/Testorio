import { guiAction } from "./guiAction"
import { Misc, Remote } from "../shared-constants"

guiAction(Misc.CloseProgressGui, () => {
  if (remote.interfaces[Remote.RunTests]) {
    remote.call(Remote.RunTests, "fireCustomEvent", "closeProgressGui")
  }
})
