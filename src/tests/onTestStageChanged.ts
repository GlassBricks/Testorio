import { TestStage } from "../constants"

export const onTestStageChanged: CustomEventId<{ stage: TestStage }> = script.generate_event_name()
