import { Data } from "typed-factorio/data/types"
import { Prototypes } from "./shared-constants"
import { Colors, Graphics } from "./constants"

declare const data: Data

data.extend([
  {
    type: "selection-tool",
    name: Prototypes.EnablerTool,
    subgoup: "tool",
    order: "z[testorio]-[enabler-tool]",
    icon: Graphics.EnablerTool,
    icon_size: 32,
    flags: ["spawnable", "only-in-cursor"],
    stack_size: 1,
    stackable: false,
    draw_label_for_cursor_render: true,
    selection_color: Colors.Green,
    alt_selection_color: Colors.Red,
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
      filename: Graphics.EnablerToolButton,
      flags: ["icon"],
      size: 32,
    },
  },
  {
    type: "sprite",
    name: Prototypes.TestTubeSprite,
    filename: Graphics.TestTube,
    priority: "extra-high-no-scale",
    size: 48,
  },
])
