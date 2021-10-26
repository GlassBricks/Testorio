import { Data } from "typed-factorio/data/types"
import { Colors, Prototypes } from "./constants"

declare const data: Data

data.extend([
  {
    type: "selection-tool",
    name: Prototypes.EnablerTool,
    subgoup: "tool",
    order: "z[testorio]-[enabler-tool]",
    icon: "__testorio__/graphics/enabler-tool.png",
    icon_size: 32,
    flags: ["spawnable", "only-in-cursor"],
    stack_size: 1,
    stackable: false,
    draw_label_for_cursor_render: true,
    selection_color: Colors.green,
    alt_selection_color: Colors.red,
    selection_mode: ["any-entity"],
    alt_selection_mode: ["any-entity"],

    selection_cursor_box_type: "copy",
    alt_selection_cursor_box_type: "not-allowed",
  },
  {
    type: "shortcut",
    name: Prototypes.EnablerTool,
    action: "spawn-item",
    item_to_spawn: Prototypes.EnablerTool,
    order: "m[testorio]-[enabler-tool]",
    icon: {
      filename: "__testorio__/graphics/enabler-tool-button.png",
      flags: ["icon"],
      size: 32,
    },
  },
])
