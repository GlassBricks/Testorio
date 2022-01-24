import { Locale, Prototypes, Remote } from "../shared-constants"
import { Colors, joinToRichText, LogHandler, MessageColor } from "./output"
import { RunResults } from "./result"
import { TestState } from "./state"
import { TestListener } from "./testEvents"
import { countActiveTests } from "./tests"
import ProgressGui = Locale.ProgressGui

interface TestProgressGui {
  player: LuaPlayer
  statusText: LabelGuiElement
  progressBar: ProgressBarGuiElement
  progressLabel: LabelGuiElement
  testCounts: TableGuiElement
  testOutput: LuaGuiElement

  totalTests: number
}

declare const global: {
  __testProgressGui: TestProgressGui
}

const TestProgressName = "testorio:test-progress"

function getTestMod(): string {
  return remote.call(Remote.Testorio, "getTestMod")
}

function StatusText(parent: LuaGuiElement, gui: TestProgressGui) {
  const statusText = parent.add({ type: "label" })
  statusText.style.font = "default-large"
  gui.statusText = statusText
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
  const colors = [MessageColor.Red, MessageColor.Yellow, MessageColor.Purple, MessageColor.Green]
  for (let i = 0; i < 4; i++) {
    const label = addLabel()
    const color = colors[i]
    if (color) label.style.font_color = Colors[color]
  }
  gui.testCounts = table
}

function TestOutput(parent: LuaGuiElement, gui: TestProgressGui) {
  const frame = parent.add({
    type: "frame",
    style: "inside_shallow_frame",
    direction: "vertical",
  })

  const pane = frame.add({
    type: "scroll-pane",
    style: "scroll_pane_in_shallow_frame",
  })
  pane.style.height = 600
  pane.style.horizontally_stretchable = true

  gui.testOutput = pane
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
  const totalTests = countActiveTests(state.rootBlock, state)
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
  const mainFrame = screen.add<"frame">({
    type: "frame",
    caption: [ProgressGui.Title, getTestMod()],
    name: TestProgressName,
    direction: "vertical",
  })
  mainFrame.auto_center = true
  mainFrame.style.width = 1000
  const contentFrame = mainFrame.add({
    type: "frame",
    style: "inside_shallow_frame_with_padding",
    direction: "vertical",
  })

  StatusText(contentFrame, gui)
  ProgressBar(contentFrame, gui)
  TestCount(contentFrame, gui)
  TestOutput(mainFrame, gui)
  updateStatus(gui, state.results)
  return gui
}

function updateStatus(gui: TestProgressGui, results: RunResults) {
  gui.progressBar.value = gui.totalTests === 0 ? 1 : results.ran / gui.totalTests
  gui.progressLabel.caption = ["", results.ran, "/", gui.totalTests]

  const testCounts = gui.testCounts.children

  if (results.failed > 0) testCounts[0].caption = [ProgressGui.NFailed, results.failed]
  if (results.skipped > 0) testCounts[1].caption = [ProgressGui.NSkipped, results.skipped]
  if (results.todo > 0) testCounts[2].caption = [ProgressGui.NTodo, results.todo]
  if (results.passed > 0) testCounts[3].caption = [ProgressGui.NPassed, results.passed]
}

export const progressGuiListener: TestListener = (event, state) => {
  const gui = global.__testProgressGui
  switch (event.type) {
    case "testRunStarted": {
      global.__testProgressGui = createTestProgressGui(state)
      break
    }
    case "enterDescribeBlock": {
      const { block } = event
      gui.statusText.caption = [ProgressGui.RunningTest, block.path]
      break
    }
    case "testEntered": {
      const { test } = event
      gui.statusText.caption = [ProgressGui.RunningTest, test.path]
      break
    }
    case "testFailed": {
      updateStatus(gui, state.results)
      gui.statusText.caption = [ProgressGui.RunningTest, event.test.parent.path]
      break
    }
    case "testPassed": {
      updateStatus(gui, state.results)
      gui.statusText.caption = [ProgressGui.RunningTest, event.test.parent.path]
      break
    }
    case "testSkipped": {
      updateStatus(gui, state.results)
      gui.statusText.caption = [ProgressGui.RunningTest, event.test.parent.path]
      break
    }
    case "testTodo": {
      updateStatus(gui, state.results)
      gui.statusText.caption = [ProgressGui.RunningTest, event.test.parent.path]
      break
    }
    case "exitDescribeBlock": {
      const { block } = event
      if (block.parent) gui.statusText.caption = [ProgressGui.RunningTest, block.parent.path]
      break
    }
    case "testRunFinished": {
      gui.statusText.caption = [ProgressGui.TestRunCompleted]
      break
    }
    case "loadError": {
      gui.statusText.caption = [ProgressGui.LoadError]
      break
    }
  }
}

export const progressGuiLogger: LogHandler = (message) => {
  const gui = global.__testProgressGui
  if (!gui || !gui.progressBar.valid) return
  const textBox = gui.testOutput.add({
    type: "text-box",
    style: Prototypes.TestOutputBoxStyle,
  })
  textBox.read_only = true
  const caption = joinToRichText(message)
  let count: number
  if (typeof caption === "string") {
    ;[, count] = string.gsub(caption, "\n", "")
  } else {
    count = 1
  }
  textBox.style.height = (count + 1) * 20
  textBox.caption = caption
}
