import { Prototypes } from "../shared-constants"

script.on_event(defines.events.on_player_selected_area, (data) => {
  if (data.item !== Prototypes.EnablerTool) return
  for (const entity of data.entities) {
    entity.active = true
  }
})

script.on_event(defines.events.on_player_alt_selected_area, (data) => {
  if (data.item !== Prototypes.EnablerTool) return
  for (const entity of data.entities) {
    entity.active = false
  }
})
