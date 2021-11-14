// This exists to avoid require module name conflicts
export default function _require_(mod: string): any {
  return require(mod)
}
