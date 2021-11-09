import { assertNever } from "../util"
import { TestState } from "./state"
import HookFn = Testorio.HookFn
import TestFn = Testorio.TestFn

export interface Source {
  readonly file?: string
  readonly line?: number
}

export function formatSource(source: Source): string {
  if (!source.file) return "<unknown source>"
  return `${source.file}:${source.line ?? 1}`
}

export type TestMode = undefined | "skip" | "only" | "todo"

export interface Test {
  readonly type: "test"

  readonly name: string
  readonly path: string

  readonly source: Source
  readonly parent: DescribeBlock
  readonly indexInParent: number

  readonly parts: {
    func: TestFn
    source: Source
  }[]
  readonly afterTest: TestFn[]

  readonly mode: TestMode
  readonly ticksBefore: number

  readonly errors: string[]
}

export function addTest(parent: DescribeBlock, name: string, source: Source, func: TestFn, mode: TestMode): Test {
  const test: Test = {
    type: "test",
    name,
    path: parent.path + " > " + name,
    parent,
    source,
    indexInParent: parent.children.length,
    parts: [
      {
        func,
        source,
      },
    ],
    afterTest: [],
    errors: [],
    mode,
    ticksBefore: parent.ticksBetweenTests,
  }
  parent.children.push(test)
  return test
}

export type HookType = `${"before" | "after"}${"Each" | "All"}` | "afterTest"

export interface Hook {
  func: HookFn
  type: HookType
}

export interface DescribeBlock {
  readonly type: "describeBlock"

  readonly name: string
  readonly path: string

  readonly source: Source

  readonly parent: DescribeBlock | undefined
  readonly children: (Test | DescribeBlock)[]
  readonly indexInParent: number

  readonly hooks: Hook[]

  readonly mode: TestMode

  ticksBetweenTests: number
}

export function addDescribeBlock(parent: DescribeBlock, name: string, source: Source, mode: TestMode): DescribeBlock {
  const block: DescribeBlock = {
    type: "describeBlock",
    name,
    path: parent.path !== "" ? parent.path + " > " + name : name,
    parent,
    indexInParent: parent?.children.length ?? -1,
    source,
    hooks: [],
    children: [],
    mode,
    ticksBetweenTests: parent.ticksBetweenTests,
  }
  parent?.children.push(block)
  return block
}

export function createRootDescribeBlock(): DescribeBlock {
  return {
    type: "describeBlock",
    name: "",
    path: "",
    source: {},
    parent: undefined,
    children: [],
    indexInParent: -1,
    hooks: [],
    mode: undefined,
    ticksBetweenTests: 0,
  }
}

export function isSkippedTest(test: Test, state: TestState) {
  return (
    test.mode === "skip" ||
    test.mode === "todo" ||
    (state.hasFocusedTests && test.mode !== "only") ||
    (state.config.test_pattern !== undefined && !string.match(test.path, state.config.test_pattern)[0])
  )
}

export function countRunningTests(block: DescribeBlock, state: TestState): number {
  if (block.mode === "skip") return 0
  let result = 0
  for (const child of block.children) {
    if (child.type === "describeBlock") result += countRunningTests(child, state)
    else if (child.type === "test") {
      if (!isSkippedTest(child, state)) result++
    } else {
      assertNever(child)
    }
  }
  return result
}
