import { Remote, TestStage } from "../constants"

let eventId: CustomEventId<{ stage: TestStage }>
if (!remote.interfaces[Remote.TestEvents]) {
  eventId = script.generate_event_name()
  remote.add_interface(Remote.TestEvents, {
    onTestStageChanged: () => eventId,
  })
} else {
  eventId = remote.call(Remote.RunTests, "onTestStageChanged")
}

export const onTestStateChanged = eventId
