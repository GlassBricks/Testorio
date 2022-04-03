import { Remote, TestStage } from "./shared-constants"

export const onTestStageChanged: CustomEventId<{ stage: TestStage }> = script.generate_event_name()
remote.add_interface(Remote.Testorio, {
  onTestStageChanged: () => onTestStageChanged,
})
