import { dest, parallel, series, src, task } from "gulp"
import * as ts from "typescript"
import * as tstl from "typescript-to-lua"
import * as path from "path"
import del from "del"
import * as fs from "fs/promises"
import globby from "globby"
import gulpTs from "gulp-typescript"
import * as child_process from "child_process"

function logDiagnostics(diagnostics: readonly ts.Diagnostic[]) {
  if (!diagnostics.length) return

  const formatHost: ts.FormatDiagnosticsHost = {
    getCanonicalFileName: (path) => path,
    getCurrentDirectory: ts.sys.getCurrentDirectory,
    getNewLine: () => ts.sys.newLine,
  }

  const message = ts.sys.writeOutputIsTTY?.()
    ? ts.formatDiagnosticsWithColorAndContext(diagnostics, formatHost)
    : ts.formatDiagnostics(diagnostics, formatHost)

  console.warn(message)
  throw new Error("build completed with diagnostics")
}

function compileTstl(configFile: string) {
  return child_process.spawn("tstl", ["-p", configFile], {
    stdio: "inherit",
    cwd: __dirname,
  })
}

// mod files, not including testorio lib itself
function buildModfiles() {
  return compileTstl("src/tsconfig.json")
}

task(buildModfiles)

async function copyLuassert() {
  const outDir = path.resolve(__dirname, "src")

  async function copyLuassert() {
    const repo = path.join(__dirname, "luassert")
    const repoSrc = path.join(repo, "src")
    const destination = path.join(outDir, "luassert")

    await del(["**/*", "!**/*.ts"], {
      cwd: destination,
    })
    const licenseDest = path.join(destination, "LICENSE")
    await fs.mkdir(path.dirname(licenseDest), {
      recursive: true,
    })
    await fs.copyFile(path.join(repo, "LICENSE"), licenseDest)

    for await (const file of globby.stream("**/*.lua", {
      cwd: repoSrc,
    })) {
      const fileContents = await fs.readFile(path.join(repoSrc, file.toString()), "utf-8")
      const newContents = fileContents.replace(/((?:^|\s|;|=)require ?\(?['"])(.+?['"]\)?)/gm, (str, first, second) => {
        return first + "__testorio__." + second
      })
      const outFile = path.join(destination, file.toString())
      await fs.mkdir(path.dirname(outFile), {
        recursive: true,
      })
      await fs.writeFile(outFile, newContents)
    }
  }

  async function copySay() {
    const repo = path.join(__dirname, "say")
    const destination = outDir
    await Promise.all([
      fs.copyFile(path.join(repo, "src/init.lua"), path.join(destination, "say.lua")),
      fs.copyFile(path.join(repo, "LICENSE"), path.join(destination, "say-LICENSE")),
    ])
  }

  await Promise.all([copyLuassert(), copySay()])
}
task(copyLuassert)

async function buildDefs() {
  const outFile = "index.d.ts"

  const fakeSrcDir = path.resolve(__dirname, "__testorio__")
  try {
    await fs.unlink(fakeSrcDir)
  } catch (e) {}
  await fs.symlink(path.resolve(__dirname, "src"), fakeSrcDir)

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
      tstl: {
        noImplicitSelf: true,
      },
      include: ["__testorio__/init.ts", "__testorio__/testUtil"],
      stripInternal: true,
    },
    ts.sys,
    __dirname,
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
  await fs.unlink(fakeSrcDir)
}
task(buildDefs)

// files intended to be used by other mods.
function compileTestorio() {
  return compileTstl("src/testorio/tsconfig-release.json")
}
task("buildTestorio", series(parallel(copyLuassert, buildDefs), compileTestorio))

function compileTestorioWithTests() {
  return compileTstl("src/testorio/tsconfig.json")
}
task("buildTestorioTest", series(parallel(copyLuassert, buildDefs), compileTestorioWithTests))

function cleanMod() {
  return del(["src/**/*.lua", "!**/*.def.lua", "!**/{scenarios,node_modules}/**", "!luassert/**", "!say/**"])
}
task("cleanMod", cleanMod)

task("buildMod", series(cleanMod, parallel(buildModfiles, "buildTestorio")))

function compileTestMod() {
  return compileTstl("testorio-test-mod/tsconfig.json")
}
task("buildTestMod", series(buildDefs, compileTestMod))

function buildFml() {
  return src("factorio-mod-linker.ts")
    .pipe(
      gulpTs({
        target: "ES2019",
        module: "commonjs",
        moduleResolution: "node",
        strict: true,
        esModuleInterop: true,
      }),
    )
    .pipe(dest("."))
}
task(buildFml)

task("buildPackage", series(cleanAll, parallel(buildDefs, buildFml)))

async function cleanAll() {
  return del([
    "**/*.{lua,js}",
    "!**/*.def.lua",
    "!**/{scenarios,node_modules}/**",
    "!luassert/**",
    "!say/**",
    "index.d.ts",
  ])
}
task("clean", cleanAll)

task(
  "buildAll",
  series(
    cleanAll,
    parallel(
      series(parallel(copyLuassert, buildDefs), parallel(compileTestorioWithTests, compileTestMod)),
      buildModfiles,
      buildFml,
    ),
  ),
)
function runFml() {
  return child_process.spawn("node", ["factorio-mod-linker.js"], {
    stdio: "inherit",
    cwd: __dirname,
  })
}

task("prepareTest", series("buildAll", runFml))
