export function assertNever(value: never): never {
  error(`value ${value} should be never`)
}

const thisFileTracebackPrefix = "\t_util.ts:"
function getErrorWithStacktrace(error: unknown) {
  const stacktrace = error instanceof Error ? error.toString() : debug.traceback(tostring(error), 3)
  // level: 1 = here, 2 = getErrorWithStackTrace(), 3 = error location

  const lines = stacktrace.split("\n")
  for (let i = 1, l = lines.length; i < l; i++) {
    if (lines[i - 1].endsWith(": in function 'xpcall'") && lines[i].startsWith(thisFileTracebackPrefix)) {
      if (lines[i - 2] === "\t[C]: in function 'rawxpcall'") {
        i--
      }
      return table.concat(lines, "\n", 1, i - 1)
    }
  }
  return stacktrace
}

export function pcallWithStacktrace<A extends any[], T>(fn: (...args: A) => T, ...args: A) {
  return xpcall(fn, getErrorWithStacktrace, ...args)
}
