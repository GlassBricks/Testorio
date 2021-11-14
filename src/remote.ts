import { TestStage } from "./shared-constants"
import { Settings } from "./constants"

export const onTestStageChanged: CustomEventId<{ stage: TestStage }> = script.generate_event_name()
remote.add_interface("testorio", {
  getTestMod() {
    return settings.global[Settings.TestMod].value as string
  },
  onTestStageChanged: () => onTestStageChanged,
})
