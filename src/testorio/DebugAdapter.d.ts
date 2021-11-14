/** @noResolution */
declare module "__debugadapter__/json" {
  function encode(value: AnyBasic | object | undefined, stack?: object): string
}
