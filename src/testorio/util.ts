export function assertNever(value: never): never {
  error(`value ${value} should be never`)
}
