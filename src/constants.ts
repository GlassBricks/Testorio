export const enum Settings {
  TestMod = "testorio:test-mod",
}

const path = "__testorio__/graphics/"
export const Graphics = {
  EnablerTool: path + "enabler-tool.png",
  EnablerToolButton: path + "enabler-tool-button.png",
  TestTube: path + "test-tube.png",
} as const

export namespace Colors {
  export const Red: Color = { r: 255, g: 40, b: 40 }
  export const Green: Color = { r: 155, g: 255, b: 122 }
}
