import { EnablerTool } from "../constants"

script.on_event(defines.events.on_player_selected_area, (data) => {
  if (data.item !== EnablerTool) return
  for (const entity of data.entities) {
    entity.active = true
  }
})

script.on_event(defines.events.on_player_alt_selected_area, (data) => {
  if (data.item !== EnablerTool) return
  for (const entity of data.entities) {
    entity.active = false
  }
})
