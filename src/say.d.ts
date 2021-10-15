interface say {
  set_namespace(namespace: string): void
  set_fallback(namespace: string): void
  set(key: string, value: string): void
  (this: void, key: string, vars?: unknown[]): string
}

declare const say: say & {
  [key: string]: Record<string, string> | undefined
}
export = say
