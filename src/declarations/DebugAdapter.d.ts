/** @noSelf */
interface DebugAdapter {
  defineGlobal(name: string): void

  breakpoint(mesg?: string | LocalisedString): void

  stepIgnore(func: (...args: any) => any): void

  stepIgnoreAll(table: object): void

  isStepIgnore(func: (...args: any) => any): boolean

  print_exception(
    type: string,
    mesg: string | LocalisedString | undefined,
  ): void

  print(
    expr: string | LocalisedString | table,
    alsoLookIn?: table | undefined,
    upStack?: number,
    category?: "console" | "stdout" | "stderr",
    noexprs?: boolean,
  ): void
}

declare const __DebugAdapter: DebugAdapter | undefined

/** @noResolution */
declare module "__debugadapter__/json" {
  function encode(value: AnyBasic | object | undefined, stack?: object): string
}
