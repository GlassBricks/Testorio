// This file should only be imported by scenario, so can have separate global

import { Colors, Locale, Prototypes, Remote, Settings, TestStage } from "../constants"
import * as modGui from "mod-gui"
import { getGlobalTestStage } from "../tests/state"
import { assertNever } from "../util"
import { onTestStageChanged } from "../tests/onTestStageChanged"

const enum GuiNames {
  ConfigWindow = "testorio:test-config",
  ConfigButton = ConfigWindow,
}

const enum GuiAction {
  CloseConfigGui = 1,
  OnModSelectionChanged,
  OnModTextfieldChanged,
  ToggleConfigGui,
  RefreshLoadedTests,
  RunTests,
}

const ModSelectWidth = 150

// gui only in not-multiplayer
declare const global: {
  configGui?: {
    playerIndex: number
    modSelect: DropDownGuiElement
    refreshButton: SpriteButtonGuiElement
    modTextField?: TextfieldGuiElement
    testStageFlow: FlowGuiElement
  }
  wasTickPaused?: boolean
  // on_load hack: only true if has metatable.
  toRunTests?: boolean
}

const modName = script.mod_name

function getModSelectItems(): LocalisedString[] {
  const mods = Object.keys(script.active_mods).filter((mod) => remote.interfaces[Remote.TestsAvailableFor + mod])
  return [["", "<", [Locale.NoMod], ">"], ...mods, ["", "<", [Locale.OtherMod], ">"]]
}

function DragHandle(parent: LuaGuiElement): EmptyWidgetGuiElement {
  const result = parent.add({
    type: "empty-widget",
    ignored_by_interaction: true,
    style: "draggable_space",
  })
  const style = result.style as LuaStyle
  style.horizontally_stretchable = true
  style.height = 24
  return result
}

function CloseButton(parent: LuaGuiElement, action: GuiAction): SpriteButtonGuiElement {
  return parent.add({
    type: "sprite-button",
    style: "frame_action_button",
    sprite: "utility/close_white",
    hovered_sprite: "utility/close_black",
    clicked_sprite: "utility/close_black",
    tooltip: ["gui.close"],
    mouse_button_filter: ["left"],
    tags: {
      modName,
      on_gui_click: action,
    },
  })
}

function TitleBar(parent: LuaGuiElement, title: LocalisedString) {
  const titleBar = parent.add({
    type: "flow",
    direction: "horizontal",
  })
  titleBar.drag_target = parent

  const style = titleBar.style as LuaStyle
  style.horizontal_spacing = 8
  style.height = 28
  titleBar.add({
    type: "label",
    caption: title,
    style: "frame_title",
    ignored_by_interaction: true,
  })
  DragHandle(titleBar)
  CloseButton(titleBar, GuiAction.CloseConfigGui)
}

function ModSelect(parent: LuaGuiElement) {
  const mainFlow = parent.add({
    type: "flow",
    direction: "horizontal",
  })
  mainFlow.add({
    type: "label",
    style: "caption_label",
    caption: ["", [Locale.LoadTestsFor], ":"],
  })

  const selectFlow = mainFlow.add({
    type: "flow",
    direction: "vertical",
  })

  const modSelectItems = getModSelectItems()

  const modSelect = selectFlow.add({
    type: "drop-down",
    items: modSelectItems,
    tags: {
      modName,
      on_gui_selection_state_changed: GuiAction.OnModSelectionChanged,
    },
  })
  ;(modSelect.style as LuaStyle).minimal_width = ModSelectWidth

  const configGui = global.configGui!
  configGui.modSelect = modSelect

  configGui.refreshButton = mainFlow.add({
    type: "sprite-button",
    style: "tool_button",
    sprite: "utility/refresh",
    tooltip: ["gui.refresh"],
    tags: {
      modName,
      on_gui_click: GuiAction.RefreshLoadedTests,
    },
  })

  let modSelectedIndex: number
  const testMod = getTestMod()
  if (testMod === "") {
    modSelectedIndex = 1
  } else {
    const foundIndex = modSelectItems.indexOf(testMod)
    if (foundIndex !== -1) {
      modSelectedIndex = foundIndex + 1
    } else {
      modSelectedIndex = modSelectItems.length
    }
  }
  modSelect.items = modSelectItems
  modSelect.selected_index = modSelectedIndex
  let modTextField: TextfieldGuiElement | undefined
  if (modSelectedIndex === modSelectItems.length) {
    modTextField = createModTextField()
    modTextField.text = testMod
  }
}

function createModTextField(): TextfieldGuiElement {
  if (global.configGui!.modTextField?.valid) {
    return global.configGui!.modTextField
  }
  const modSelect = global.configGui!.modSelect
  const textfield = modSelect.parent!.add({
    type: "textfield",
    lose_focus_on_confirm: true,
    tags: {
      modName,
      on_gui_text_changed: GuiAction.OnModTextfieldChanged,
    },
    index: 2,
  })
  ;(textfield.style as LuaStyle).width = ModSelectWidth

  global.configGui!.modTextField = textfield
  return textfield
}

function destroyModTextField() {
  const configGui = global.configGui!
  if (!configGui.modTextField) return
  configGui.modTextField.destroy()
  configGui.modTextField = undefined
}

function updateModSelectGui() {
  const configGui = global.configGui
  if (!configGui) return
  const mainFlow = configGui.testStageFlow
  mainFlow.clear()

  const buttons = {
    runTests: false,
  }
  let message: LocalisedString
  const stage = getGlobalTestStage()
  if (stage === TestStage.NotRun) {
    message = [Locale.TestsNotRun]
    buttons.runTests = true
  } else if (stage === TestStage.Running || stage === TestStage.ToReload) {
    message = [Locale.TestsRunning]
  } else if (stage === TestStage.Completed || stage === TestStage.LoadError) {
    message = [Locale.TestsCompleted]
  } else {
    assertNever(stage)
  }

  mainFlow.add({
    type: "label",
    caption: message,
  })

  const bottomFlow = mainFlow.add({
    type: "flow",
    direction: "horizontal",
  })

  const modSelect = global.configGui!.modSelect
  if (buttons.runTests) {
    const button = bottomFlow.add({
      type: "button",
      style: "green_button",
      caption: [Locale.RunTests],
      tags: {
        modName,
        on_gui_click: GuiAction.RunTests,
      },
    })

    button.enabled = typeof modSelect.items[modSelect.selected_index - 1] === "string"
  }

  if (stage !== TestStage.NotRun) {
    configGui.modSelect.enabled = false
    if (configGui.modTextField) configGui.modTextField.enabled = false
    configGui.refreshButton.enabled = false
  }
}

script.on_event(onTestStageChanged, updateModSelectGui)

function TestStageBar(parent: FrameGuiElement) {
  global.configGui!.testStageFlow = parent.add({
    type: "flow",
    direction: "vertical",
  })

  updateModSelectGui()
}

function createConfigGui(player: LuaPlayer): FrameGuiElement {
  global.configGui = {
    playerIndex: player.index,
  } as typeof global["configGui"]

  const frame = player.gui.screen.add({
    type: "frame",
    name: GuiNames.ConfigWindow,
    direction: "vertical",
  })

  TitleBar(frame, [Locale.TestConfiguration])
  ModSelect(frame)
  frame.add({
    type: "line",
    direction: "horizontal",
  })
  TestStageBar(frame)

  frame.location = [100, 100]
  return frame
}

function destroyConfigGui() {
  const configGui = global.configGui
  if (!configGui) return
  global.configGui = undefined
  const element = game.players[configGui.playerIndex].gui.screen[GuiNames.ConfigWindow]
  if (element && element.valid) {
    element.destroy()
  }
}

function toggleConfigGui(player: LuaPlayer) {
  if (global.configGui) {
    destroyConfigGui()
  } else {
    createConfigGui(player)
  }
}

function createConfigGuiButton(player: LuaPlayer) {
  const flow = modGui.get_button_flow(player)
  flow[GuiNames.ConfigButton]?.destroy()
  modGui.get_button_flow(player).add({
    type: "sprite-button",
    name: GuiNames.ConfigButton,
    style: modGui.button_style,
    sprite: Prototypes.TestTubeSprite,
    tooltip: [Locale.Tests],
    tags: {
      modName,
      on_gui_click: GuiAction.ToggleConfigGui,
    },
  })
}

function destroyConfigGuiButton(player: LuaPlayer) {
  modGui.get_button_flow(player)[GuiNames.ConfigButton]?.destroy()
}

script.on_event(defines.events.on_player_removed, (e) => {
  if (global.configGui && global.configGui.playerIndex === e.player_index) {
    destroyConfigGui()
  }
})

script.on_event(defines.events.on_player_created, (e) => {
  if (game.is_multiplayer()) return
  createConfigGuiButton(game.players[e.player_index])
})

function onLoad() {
  const previous = global.configGui?.playerIndex
  destroyConfigGui()
  if (game.is_multiplayer()) {
    for (const [, player] of pairs(game.players)) {
      destroyConfigGuiButton(player)
    }
  } else {
    for (const [, player] of pairs(game.players)) {
      createConfigGuiButton(player)
    }
  }
  if (!game.is_multiplayer() && previous) {
    const gui = createConfigGui(game.players[previous])
    gui.bring_to_front()
  }
  if (global.wasTickPaused !== undefined) {
    game.tick_paused = global.wasTickPaused
    global.wasTickPaused = undefined
  }
  if (global.toRunTests) {
    global.toRunTests = undefined
    if (!remote.interfaces[Remote.TestRun]) {
      game.print("Could not run tests: tests not loaded after refresh", Colors.red)
    } else {
      remote.call(Remote.TestRun, "runTests")
    }
  }

  script.on_event(defines.events.on_tick, undefined)
}

script.on_configuration_changed(onLoad)
script.on_event(defines.events.on_tick, onLoad)

function setTestMod(mod: string) {
  settings.global[Settings.TestMod] = { value: mod }
  if (global.configGui) {
    updateModSelectGui()
  }
}

function getTestMod(): string {
  return settings.global[Settings.TestMod].value as string
}

function onModSelectionChanged() {
  const { modSelect } = global.configGui!
  const modSelectItems = modSelect.items

  const selectedIndex = modSelect.selected_index
  const selected = modSelectItems[selectedIndex - 1]

  let selectedMod: string
  let isOther = false
  if (typeof selected === "string") {
    selectedMod = selected
  } else if (selectedIndex === 1) {
    selectedMod = ""
  } else {
    isOther = true
    selectedMod = ""
  }
  if (isOther) {
    createModTextField()
  } else {
    destroyModTextField()
  }
  setTestMod(selectedMod)
  updateModSelectGui()
}

function onModTextfieldChanged(e: OnGuiTextChangedEvent) {
  const element = e.element as TextfieldGuiElement
  const modSelect = global.configGui?.modSelect
  if (!modSelect || modSelect.selected_index !== modSelect.items.length) return
  setTestMod(element.text)
}

/** @see onLoad */
function refresh() {
  global.wasTickPaused = game.tick_paused
  game.tick_paused = false
  game.reload_mods()
}

function prepareRunTests() {
  const testMod = getTestMod()
  game.auto_save("beforeTest-" + testMod)
  global.wasTickPaused = game.tick_paused
  game.tick_paused = false
  let counter = 0
  script.on_event(defines.events.on_tick, () => {
    counter++
    if (counter !== 2) return
    global.toRunTests = true
    game.reload_mods()
  })
}

const guiActions: Record<GuiAction, (this: void, event: any) => void> = {
  [GuiAction.CloseConfigGui]: destroyConfigGui,
  [GuiAction.OnModSelectionChanged]: onModSelectionChanged,
  [GuiAction.OnModTextfieldChanged]: onModTextfieldChanged,
  [GuiAction.ToggleConfigGui](e: OnGuiClickEvent) {
    toggleConfigGui(game.players[e.player_index])
  },
  [GuiAction.RefreshLoadedTests]: refresh,
  [GuiAction.RunTests]: prepareRunTests,
}

const events = ["on_gui_click", "on_gui_selection_state_changed", "on_gui_text_changed"] as const
for (const eventName of events) {
  script.on_event(defines.events[eventName], (e) => {
    const element = e.element
    if (!element) return
    const tags = element.tags
    if (tags.modName !== modName) return
    const method = tags[eventName]
    if (!method) return
    guiActions[method as GuiAction](e)
  })
}
