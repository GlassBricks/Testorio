import { guiAction } from "./guiAction"
import { Misc, Remote } from "../shared-constants"

guiAction(Misc.CloseProgressGui, () => {
  if (remote.interfaces[Remote.Testorio]) {
    remote.call(Remote.Testorio, "fireCustomEvent", "closeProgressGui")
  }
})
