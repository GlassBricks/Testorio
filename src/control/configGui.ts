import { Locale, Prototypes, Remote, TestStage } from "../shared-constants"
import * as modGui from "mod-gui"
import { GuiAction, guiAction } from "./guiAction"
import { postLoadAction } from "./postLoadAction"
import { Settings } from "../constants"

const TestConfigName = "testorio:test-config"
const ModSelectWidth = 150
const modName = script.mod_name

// there can only be one gui
declare const global: {
  configGui?: {
    player: LuaPlayer
    modSelect: DropDownGuiElement
    refreshButton: SpriteButtonGuiElement
    modTextField?: TextfieldGuiElement
    testStageFlow: FlowGuiElement
  }
}
function configGuiValid(): boolean {
  return global.configGui !== undefined && global.configGui.player.valid
}

function getModSelectItems(): LocalisedString[] {
  const mods = Object.keys(script.active_mods).filter((mod) => remote.interfaces[Remote.TestsAvailableFor + mod])
  return [[Locale.NoMod], ...mods, [Locale.OtherMod]]
}

function DragHandle(parent: LuaGuiElement) {
  const element = parent.add({
    type: "empty-widget",
    ignored_by_interaction: true,
    style: "draggable_space",
  })
  const style = element.style
  style.horizontally_stretchable = true
  style.height = 24
}

function CloseButton(parent: LuaGuiElement, action: GuiAction) {
  parent.add({
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

  const style = titleBar.style
  style.horizontal_spacing = 8
  style.height = 28
  titleBar.add({
    type: "label",
    caption: title,
    style: "frame_title",
    ignored_by_interaction: true,
  })
  DragHandle(titleBar)
  CloseButton(titleBar, DestroyConfigGui)
}

function setTestMod(mod: string) {
  settings.global[Settings.TestMod] = { value: mod }
  updateTestStageGui()
}

function getTestMod(): string {
  return settings.global[Settings.TestMod].value as string
}

function ModSelect(parent: LuaGuiElement) {
  const mainFlow = parent.add({
    type: "flow",
    direction: "horizontal",
  })
  mainFlow.add({
    type: "label",
    style: "caption_label",
    caption: [Locale.LoadTestsFor],
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
      on_gui_selection_state_changed: OnModSelectionChanged,
    },
  })
  modSelect.style.minimal_width = ModSelectWidth

  const configGui = global.configGui!
  configGui.modSelect = modSelect

  configGui.refreshButton = mainFlow.add({
    type: "sprite-button",
    style: "tool_button",
    sprite: "utility/refresh",
    tooltip: [Locale.ReloadMods],
    tags: {
      modName,
      on_gui_click: Refresh,
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

const OnModSelectionChanged = guiAction("OnModSelectionChanged", () => {
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
  updateTestStageGui()
})

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
      on_gui_text_changed: OnModTextfieldChanged,
    },
    index: 2,
  })
  textfield.style.width = ModSelectWidth

  global.configGui!.modTextField = textfield
  return textfield
}

const OnModTextfieldChanged = guiAction("OnModTextfieldChanged", (e: OnGuiTextChangedEvent) => {
  const element = e.element as TextfieldGuiElement
  setTestMod(element.text)
})

function destroyModTextField() {
  const configGui = global.configGui!
  if (!configGui.modTextField) return
  configGui.modTextField.destroy()
  configGui.modTextField = undefined
}

function TestStageBar(parent: LuaGuiElement) {
  global.configGui!.testStageFlow = parent.add({
    type: "flow",
    direction: "vertical",
  })
}

const afterRefresh = postLoadAction("afterRefresh", () => {
  refreshConfigGui()
})
const Refresh = guiAction("refresh", () => {
  game.reload_mods()
  afterRefresh()
})

const runTests = postLoadAction("runTests", () => {
  if (!remote.interfaces[Remote.RunTests]) {
    game.print(`No tests loaded for mod ${getTestMod()}; try reloading.`)
    return
  }
  destroyConfigGui()
  remote.call(Remote.RunTests, "runTests")
  updateTestStageGui()
})

const ReloadAndStartTests = guiAction("reloadAndStartTests", () => {
  game.reload_mods()
  game.auto_save("beforeTest-" + getTestMod())
  runTests()
})

const StartTests = guiAction("startTests", () => {
  game.auto_save("beforeTest-" + getTestMod())
  runTests()
})

function updateTestStageGui() {
  if (!configGuiValid()) return
  const configGui = global.configGui!
  const mainFlow = configGui.testStageFlow
  mainFlow.clear()

  let runTestsButtons = false
  let message: LocalisedString
  const stage = settings.global[Settings.TestStage].value as TestStage
  if (stage === TestStage.NotRun) {
    message = [Locale.TestsNotRun]
    runTestsButtons = true
  } else {
    message = [Locale.TestsRan]
  }

  mainFlow.add({
    type: "label",
    caption: message,
  })

  if (runTestsButtons) {
    const buttonFlow = mainFlow.add({
      type: "flow",
      direction: "horizontal",
    })

    const refreshRunEnabled = remote.interfaces[Remote.TestsAvailableFor + getTestMod()] !== undefined
    buttonFlow.add({
      type: "button",
      style: "green_button",
      caption: [Locale.ReloadAndRunTests],
      tags: {
        modName,
        on_gui_click: ReloadAndStartTests,
      },
      enabled: refreshRunEnabled,
      tooltip: !refreshRunEnabled ? [Locale.ModNotRegisteredTests] : undefined,
    })
    const spacer = buttonFlow.add({
      type: "empty-widget",
    })
    spacer.style.horizontally_stretchable = true

    const runNowEnabled =
      remote.interfaces[Remote.RunTests] !== undefined && remote.call(Remote.RunTests, "modName") === getTestMod()
    buttonFlow.add({
      type: "button",
      caption: [Locale.RunNow],
      tags: {
        modName,
        on_gui_click: StartTests,
      },
      enabled: runNowEnabled,
      tooltip: !runNowEnabled ? [Locale.ModNotLoadedTests] : undefined,
    })
  }

  if (stage !== TestStage.NotRun) {
    configGui.modSelect.enabled = false
    if (configGui.modTextField) configGui.modTextField.enabled = false
    configGui.refreshButton.enabled = false
  }
}

function createConfigGui(player: LuaPlayer): FrameGuiElement {
  player.gui.screen[TestConfigName]?.destroy()
  global.configGui = { player } as typeof global["configGui"]

  const frame = player.gui.screen.add({
    type: "frame",
    name: TestConfigName,
    direction: "vertical",
  })
  frame.auto_center = true

  TitleBar(frame, [Locale.TestConfigTitle])
  ModSelect(frame)
  frame.add({
    type: "line",
    direction: "horizontal",
  })
  TestStageBar(frame)

  updateTestStageGui()

  return frame
}

function destroyConfigGui() {
  if (!configGuiValid()) return
  const configGui = global.configGui!
  global.configGui = undefined
  const element = configGui.player.gui.screen[TestConfigName]
  if (element && element.valid) {
    element.destroy()
  }
}
const DestroyConfigGui = guiAction("destroyConfigGui", destroyConfigGui)

const ToggleConfigGui = guiAction("toggleConfigGui", (e) => {
  if (game.is_multiplayer()) {
    destroyConfigGui()
    game.players[e.player_index].print("Tests cannot be run in multiplayer")
  } else if (configGuiValid()) {
    destroyConfigGui()
  } else {
    createConfigGui(game.players[e.player_index])
  }
})

function createModButton(player: LuaPlayer) {
  const flow = modGui.get_button_flow(player)
  flow[TestConfigName]?.destroy()
  modGui.get_button_flow(player).add({
    type: "sprite-button",
    name: TestConfigName,
    style: modGui.button_style,
    sprite: Prototypes.TestTubeSprite,
    tooltip: [Locale.Tests],
    tags: {
      modName,
      on_gui_click: ToggleConfigGui,
    },
  })
}

function refreshConfigGui() {
  if (!configGuiValid()) return
  const previousPlayer = global.configGui!.player
  destroyConfigGui()
  if (!game.is_multiplayer()) {
    const gui = createConfigGui(previousPlayer)
    gui.bring_to_front()
  }
}

function createModButtonForAllPlayers() {
  for (const [, player] of pairs(game.players)) {
    createModButton(player)
  }
}

script.on_init(createModButtonForAllPlayers)
script.on_configuration_changed(refreshConfigGui)

script.on_event([defines.events.on_player_removed, defines.events.on_player_left_game], (e) => {
  if (global.configGui && global.configGui.player.valid && global.configGui.player.index === e.player_index) {
    destroyConfigGui()
  }
})

script.on_event([defines.events.on_player_created, defines.events.on_player_joined_game], (e) => {
  createModButton(game.players[e.player_index])
  if (game.is_multiplayer() || game.connected_players.length > 1) {
    destroyConfigGui()
  }
})
