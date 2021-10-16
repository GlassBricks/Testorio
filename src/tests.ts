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
  readonly errors: string[]

  mode: TestMode

  readonly ticksBefore: number

  result?: "passed" | "failed" | "skipped" | "todo"
}

export function addTest(
  parent: DescribeBlock,
  name: string,
  source: Source,
  func: TestFn,
  mode: TestMode,
): Test {
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
    errors: [],
    mode,
    ticksBefore: parent.ticksBetweenTests,
  }
  parent.children.push(test)
  return test
}

export type HookType = `${"before" | "after"}${"Each" | "All"}`

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

  mode: TestMode

  ticksBetweenTests: number
}

export function addDescribeBlock(
  parent: DescribeBlock,
  name: string,
  source: Source,
  mode: TestMode,
): DescribeBlock {
  mode ??= parent.mode
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

export type OnTickFn = (tick: number) => void | false
