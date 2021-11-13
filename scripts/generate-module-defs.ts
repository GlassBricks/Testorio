import * as fs from "fs/promises"
import * as path from "path"
import { fileURLToPath } from "url"
import ts from "typescript"

const dirName = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const outFile = "index.d.ts"

const fakeSrcDir = path.resolve(dirName, "__testorio__")
await fs.symlink(path.resolve(dirName, "src"), fakeSrcDir)

const { options, fileNames, projectReferences, errors } = ts.parseJsonConfigFileContent(
  {
    compilerOptions: {
      target: "esnext",
      module: "none",
      moduleResolution: "node",
      types: ["typed-factorio/runtime"],
      strict: true,
      rootDir: ".",
      declaration: true,
      emitDeclarationOnly: true,
      outFile,
    },
    include: ["__testorio__/init.ts", "__testorio__/testUtil"],
    stripInternal: true,
  },
  ts.sys,
  dirName,
)
if (errors?.length) {
  logDiagnostics(errors)
}

const writeFile: ts.WriteFileCallback = (fileName, data, mark) => {
  const result = data!.replace(/^declare module /gm, (str) => "/** @noResolution */" + ts.sys.newLine + str)
  ts.sys.writeFile(fileName, result, mark)
}

const program = ts.createProgram({
  options,
  rootNames: fileNames,
  projectReferences,
})
const emitResult = program.emit(undefined, writeFile)
if (emitResult.diagnostics) {
  logDiagnostics(emitResult.diagnostics)
}
void fs.unlink(fakeSrcDir)

function logDiagnostics(diagnostics: readonly ts.Diagnostic[]) {
  if (!diagnostics.length) return
  const pretty = ts.sys.writeOutputIsTTY?.()
  const formatHost: ts.FormatDiagnosticsHost = {
    getCanonicalFileName: (path) => path,
    getCurrentDirectory: ts.sys.getCurrentDirectory,
    getNewLine: () => ts.sys.newLine,
  }

  const message = pretty
    ? ts.formatDiagnosticsWithColorAndContext(diagnostics, formatHost)
    : ts.formatDiagnostics(diagnostics, formatHost)

  console.warn(message)
}
