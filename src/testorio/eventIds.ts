import { Remote, TestStage } from "../shared-constants"

let eventId: CustomEventId<{ stage: TestStage }>
if (!remote.interfaces[Remote.Testorio]) {
  eventId = script.generate_event_name()
  remote.add_interface(Remote.Testorio, {
    onTestStageChanged: () => eventId,
  })
} else {
  eventId = remote.call(Remote.RunTests, "onTestStageChanged")
}

export const onTestStateChanged = eventId
