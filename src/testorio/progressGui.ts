import { Locale, Settings } from "../shared-constants"
import { TestListener } from "./testEvents"
import { countRunningTests } from "./tests"
import { TestState } from "./state"
import { RunResults } from "./result"
import { logColors, LogHandler } from "./log"

namespace Colors {
  export const Red: Color = { r: 255, g: 40, b: 40 }
  export const Green: Color = { r: 155, g: 255, b: 122 }
  export const Yellow: Color = { r: 255, g: 204, b: 20 }
  export const Purple: Color = { r: 240, g: 20, b: 220 }
}

interface TestProgressGui {
  player: LuaPlayer
  statusText: LabelGuiElement
  progressBar: ProgressbarGuiElement
  progressLabel: LabelGuiElement
  testCounts: TableGuiElement
  testOutput: TextBoxGuiElement

  totalTests: number
}

declare const global: {
  __testProgressGui: TestProgressGui
}

const TestProgressName = "testorio:test-progress"

function getTestMod(): string {
  return settings.global[Settings.TestMod].value as string
}

function StatusText(parent: LuaGuiElement, gui: TestProgressGui) {
  const message = "Running __something__"

  gui.statusText = parent.add({
    type: "label",
    caption: message,
  })
}

function ProgressBar(parent: LuaGuiElement, gui: TestProgressGui) {
  const progressFlow = parent.add<"flow">({
    type: "flow",
    direction: "horizontal",
  })
  progressFlow.style.horizontally_stretchable = true
  progressFlow.style.vertical_align = "center"

  const progressBar = progressFlow.add({
    type: "progressbar",
  })
  progressBar.style.horizontally_stretchable = true

  const progressLabel = progressFlow.add({
    type: "label",
  })
  const plStyle = progressLabel.style
  plStyle.width = 80
  plStyle.horizontal_align = "center"

  gui.progressBar = progressBar
  gui.progressLabel = progressLabel
}

function TestCount(parent: LuaGuiElement, gui: TestProgressGui) {
  const table = parent.add<"table">({
    type: "table",
    column_count: 4,
    style: "bordered_table",
  })

  function addLabel() {
    const result = table.add({
      type: "label",
    })
    const style = result.style
    style.horizontally_stretchable = true
    style.horizontal_align = "center"
    return result
  }
  const colors = [Colors.Green, Colors.Red, Colors.Yellow, Colors.Purple]
  for (let i = 0; i < 4; i++) {
    const label = addLabel()
    const color = colors[i]
    if (color) label.style.font_color = color
  }
  gui.testCounts = table
}

function TestOutput(parent: LuaGuiElement, gui: TestProgressGui) {
  const box = parent.add<"text-box">({
    type: "text-box",
  })
  box.read_only = true
  box.style.height = 250
  box.style.horizontally_stretchable = true
  box.style.natural_width = 1000
  box.style.maximal_width = 1000

  gui.testOutput = box
}

function getPlayer(): LuaPlayer {
  // noinspection LoopStatementThatDoesntLoopJS
  for (const [, player] of pairs(game.players)) {
    return player
  }
  error("Could not find any players!")
}

function createTestProgressGui(state: TestState): TestProgressGui {
  const player = getPlayer()
  const totalTests = countRunningTests(state.rootBlock, state)
  const gui: TestProgressGui = {
    player,
    progressBar: undefined!,
    progressLabel: undefined!,
    statusText: undefined!,
    testCounts: undefined!,
    testOutput: undefined!,
    totalTests,
  }

  const screen = player.gui.screen
  screen[TestProgressName]?.destroy()
  const frame = screen.add<"frame">({
    type: "frame",
    caption: [Locale.TestProgressGuiTitle, getTestMod()],
    direction: "vertical",
    name: TestProgressName,
  })
  frame.auto_center = true
  frame.style.width = 600

  StatusText(frame, gui)
  ProgressBar(frame, gui)
  TestCount(frame, gui)
  TestOutput(frame, gui)
  updateStatus(gui, state.results)
  return gui
}

function updateStatus(gui: TestProgressGui, results: RunResults) {
  gui.progressBar.value = gui.totalTests === 0 ? 1 : results.ran / gui.totalTests
  gui.progressLabel.caption = ["", results.ran, "/", gui.totalTests]

  const testCounts = gui.testCounts.children

  testCounts[0].caption = [Locale.Passed, results.passed]
  if (results.failed > 0) testCounts[1].caption = [Locale.Failed, results.failed]
  if (results.skipped > 0) testCounts[2].caption = [Locale.Skipped, results.skipped]
  if (results.todo > 0) testCounts[3].caption = [Locale.Todo, results.todo]
}

export const progressGuiListener: TestListener = (event, state) => {
  const gui = global.__testProgressGui
  switch (event.type) {
    case "startTestRun": {
      global.__testProgressGui = createTestProgressGui(state)
      break
    }
    case "enterDescribeBlock": {
      const { block } = event
      gui.statusText.caption = [Locale.RunningTest, block.path]
      break
    }
    case "testStarted": {
      const { test } = event
      gui.statusText.caption = [Locale.RunningTest, test.path]
      break
    }
    case "testFailed": {
      updateStatus(gui, state.results)
      gui.statusText.caption = [Locale.RunningTest, event.test.parent.path]
      break
    }
    case "testPassed": {
      updateStatus(gui, state.results)
      gui.statusText.caption = [Locale.RunningTest, event.test.parent.path]
      break
    }
    case "testSkipped": {
      updateStatus(gui, state.results)
      gui.statusText.caption = [Locale.RunningTest, event.test.parent.path]
      break
    }
    case "testTodo": {
      updateStatus(gui, state.results)
      gui.statusText.caption = [Locale.RunningTest, event.test.parent.path]
      break
    }
    case "exitDescribeBlock": {
      const { block } = event
      if (block.parent) gui.statusText.caption = [Locale.RunningTest, block.parent.path]
      break
    }
    case "finishTestRun":
    case "loadError": {
      gui.statusText.caption = [Locale.TestsCompleted]
      break
    }
  }
}

const colors = logColors.map((x) => x.join())

export const progressGuiLogger: LogHandler = (level, message) => {
  const gui = global.__testProgressGui
  if (!gui) return
  const color = colors[level - 1]
  gui.testOutput.text += table.concat(["[color=", color, "]", message, "[/color]\n"])
}
