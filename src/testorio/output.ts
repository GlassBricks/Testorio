import { debugAdapterEnabled } from "./_util"
import { TestListener } from "./testEvents"
import { Source } from "./tests"

export enum MessageColor {
  White = 1,
  Green,
  Yellow,
  Red,
  Purple,
}
export const Colors: Record<MessageColor, ColorArray> = {
  [MessageColor.White]: [1, 1, 1],
  [MessageColor.Green]: [71, 221, 37],
  [MessageColor.Yellow]: [252, 237, 50],
  [MessageColor.Red]: [200, 50, 50],
  [MessageColor.Purple]: [177, 156, 220],
}
const ColorFormat: Record<MessageColor, string> = {} as any
for (const [code, color] of pairs(Colors)) {
  ColorFormat[code] = `[color=${color.join()}]`
}

interface MessagePart {
  text: string | LuaProfiler
  color?: MessageColor
  bold?: boolean
}

function bold(text: string): MessagePart {
  return {
    text,
    bold: true,
  }
}

function red(text: string): MessagePart {
  return {
    text,
    color: MessageColor.Red,
  }
}

// function yellow(text: string): MessagePart {
//   return {
//     text,
//     color: MessageColor.Yellow,
//   }
// }
//
function green(text: string): MessagePart {
  return {
    text,
    color: MessageColor.Green,
  }
}

function purple(text: string): MessagePart {
  return {
    text,
    color: MessageColor.Purple,
  }
}

function m(strings: TemplateStringsArray, ...substitutions: (string | number | LuaProfiler | MessagePart)[]) {
  const result: MessagePart[] = []
  for (const i of $range(1, strings.length * 2 - 1)) {
    const item = i % 2 === 0 ? strings[i / 2] : substitutions[(i - 1) / 2]
    if (typeof item === "object" && !(item as LuaProfiler).object_name) {
      result.push(item as MessagePart)
    } else {
      result.push({ text: item as string })
    }
  }
  return result
}

export function joinToPlainText(parts: MessagePart[]): LocalisedString {
  let isString = true
  let result: ["", ...string[]] = [""]
  for (const part of parts) {
    if (typeof part.text !== "object") {
      result.push(part.text)
    } else {
      if (isString) result = ["", table.concat(result), part.text as never]
      isString = false
    }
  }
  return isString ? table.concat(result) : result
}

export function joinToRichText(parts: MessagePart[]): LocalisedString {
  let isString = true
  let result: ["", ...string[]] = [""]
  for (const part of parts) {
    if (part.bold) result.push("[font=default-bold]")
    if (part.color) result.push(ColorFormat[part.color])
    if (typeof part.text !== "object") {
      result.push(part.text)
    } else {
      if (isString) result = ["", table.concat(result), part.text as never]
      isString = false
    }
    if (part.color) result.push("[/color]")
    if (part.bold) result.push("[/font]")
  }
  return isString ? table.concat(result) : result
}

export type LogHandler = (message: MessagePart[], source: Source | undefined) => void

const logHandlers: LogHandler[] = []

export function addLogHandler(handler: LogHandler): void {
  logHandlers.push(handler)
}

function testLog(message: MessagePart[], source?: Source): void {
  for (const logHandler of logHandlers) {
    logHandler(message, source)
  }
}
const jsonEncode: typeof import("__debugadapter__/json").encode = !debugAdapterEnabled
  ? undefined
  : require("@NoResolution:__debugadapter__/json").encode
const daTranslate: typeof import("__debugadapter__/variables").translate = !debugAdapterEnabled
  ? undefined
  : __DebugAdapter
  ? require("@NoResolution:__debugadapter__/variables").translate
  : (() => {
      let id = 0
      return (message) => {
        const translationID = id++
        const [success, result] = pcall(localised_print, [
          "***DebugAdapterBlockPrint***\nDBGtranslate: ",
          translationID,
          "\n",
          message,
          "\n***EndDebugAdapterBlockPrint***",
        ])
        return success ? translationID : (result as string)
      }
    })()

const DebugAdapterCategories: Record<MessageColor, string> = {
  [MessageColor.White]: "stdout",
  [MessageColor.Green]: "stdout",
  [MessageColor.Yellow]: "console",
  [MessageColor.Red]: "stderr",
  [MessageColor.Purple]: "console",
}
export const debugAdapterLogger: LogHandler = (message, source) => {
  const color = message.find((x) => x.color)?.color ?? MessageColor.White
  const category = DebugAdapterCategories[color ?? MessageColor.White]
  if (message.length === 1 && typeof message[0].text === "string") {
    const text: string = message[0].text
    const lines = text.split("\n")
    for (const line of lines) {
      let sourceFile: string | undefined, sourceLine: number | undefined
      if (source) {
        sourceFile = source.file
        if (source.line) {
          sourceLine = source.line
        }
        source = undefined
      } else {
        const [, , file1, line1] = string.find(line, "(__[%a%-_]+__/.-%.%a+):(%d*)")
        {
          sourceFile = file1 as string
          sourceLine = tonumber(line1)
        }
      }
      if (sourceFile && !sourceFile.startsWith("@")) sourceFile = "@" + sourceFile
      const body = {
        category,
        output: line,
        line: sourceFile && (sourceLine ?? 1),
        source: {
          name: sourceFile,
          path: sourceFile,
        },
      }

      print("DBGprint: " + jsonEncode!(body))
    }
  } else {
    const text = joinToPlainText(message)

    const output = typeof text === "string" ? text : `{LocalisedString ${daTranslate(text)}}`
    const sourceFile = source?.file
    const body = {
      category,
      output,
      line: source && (tonumber(source.line) ?? 1),
      source: {
        name: sourceFile,
        path: sourceFile,
      },
    }

    print("DBGprint: " + jsonEncode!(body))
  }
}

export const logLogger: LogHandler = (message) => {
  log(joinToPlainText(message))
}

export const gameLogger: LogHandler = (message) => {
  if (game) game.print(joinToRichText(message))
}

export const logListener: TestListener = (event, state) => {
  switch (event.type) {
    case "testPassed": {
      const { test } = event
      testLog(m`${bold(test.path)}: ${green("passed")}`, test.source)
      break
    }
    case "testFailed": {
      const { test } = event
      testLog(m`${bold(test.path)}: ${red("failed")}`, test.source)
      for (const error of test.errors) {
        testLog([red(error)])
      }
      break
    }
    case "testTodo": {
      const { test } = event
      testLog(m`${bold(test.path)}: ${purple("todo")}`, test.source)
      break
    }
    case "testRunFinished": {
      const results = state.results
      if (results.additionalErrors.length > 0) {
        testLog([
          {
            text: `There are ${results.additionalErrors.length} additional errors:\n`,
            color: MessageColor.Red,
            bold: true,
          },
        ])
        for (const error of results.additionalErrors) {
          testLog([red(error)])
        }
      }
      const status = results.status

      const endReport = [
        {
          text: `\nTest run finished: ${status === "todo" ? "passed with todo items" : status}\n`,
          bold: true,
          color:
            status === "passed"
              ? MessageColor.Green
              : status === "failed"
              ? MessageColor.Red
              : status === "todo"
              ? MessageColor.Purple
              : MessageColor.White,
        },
        bold(`Ran ${results.ran} tests\n`),
      ]
      if (results.failed > 0) {
        endReport.push({
          text: `${results.failed} failed\n`,
          color: MessageColor.Red,
          bold: true,
        })
      }
      if (results.additionalErrors.length > 0) {
        endReport.push({
          text: `${results.additionalErrors.length} additional errors\n`,
          color: MessageColor.Red,
          bold: true,
        })
      }
      if (results.skipped > 0) {
        endReport.push({
          text: `${results.skipped} skipped\n`,
          color: MessageColor.Yellow,
          bold: true,
        })
      }
      if (results.todo > 0) {
        endReport.push({
          text: `${results.todo} todo\n`,
          color: MessageColor.Purple,
          bold: true,
        })
      }
      if (results.passed > 0) {
        endReport.push({
          text: `${results.passed} passed\n`,
          color: MessageColor.Green,
          bold: true,
        })
      }
      testLog(endReport)
      break
    }
    case "loadError": {
      const result = state.results
      testLog([
        {
          text: "There was an load error:",
          bold: true,
          color: MessageColor.Red,
        },
      ])
      testLog([red(result.additionalErrors[0])])
      break
    }
  }
}
