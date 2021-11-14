// This exists to avoid require module name conflicts
export = function _require_(mod: string): any {
  return require(mod)
}
