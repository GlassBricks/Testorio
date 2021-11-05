/* eslint-disable import/no-mutable-exports */
import { Remote, TestStage } from "../constants"
import type { TestEvent } from "./testEvents"

export { onTestStateChanged, onTestEvent }
let onTestStateChanged: CustomEventId<{ stage: TestStage }>
let onTestEvent: CustomEventId<TestEvent>
if (!remote.interfaces[Remote.TestEvents]) {
  onTestStateChanged = script.generate_event_name()
  onTestEvent = script.generate_event_name()
  remote.add_interface(Remote.TestEvents, {
    onTestStageChanged: () => onTestStateChanged,
    onTestEvent: () => onTestEvent,
  })
} else {
  onTestStateChanged = remote.call(Remote.RunTests, "onTestStageChanged")
  onTestEvent = remote.call(Remote.RunTests, "onTestEvent")
}
