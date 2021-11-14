import { TestStage } from "./shared-constants"
import { Settings } from "./constants"

const onTestStageChanged: CustomEventId<{ stage: TestStage }> = script.generate_event_name()
remote.add_interface("testorio", {
  getGlobalTestStage() {
    return settings.global[Settings.TestStage].value as TestStage
  },
  getTestMod() {
    return settings.global[Settings.TestMod].value as string
  },
  setGlobalTestStage(stage: TestStage) {
    settings.global[Settings.TestStage] = { value: stage }
    script.raise_event(onTestStageChanged, { stage })
  },
  onTestStageChanged: () => onTestStageChanged,
})
