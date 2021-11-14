import * as gulp from "gulp"
import * as ts from "typescript"
import * as tstl from "typescript-to-lua"
import * as path from "path"
import del from "del"
import * as fs from "fs/promises"
import globby from "globby"
import gulpTs from "gulp-typescript"

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

async function compileTstl(configFile: string) {
  const result = tstl.transpileProject(path.join(__dirname, configFile))
  logDiagnostics(result.diagnostics)
}

// mod files, not including testorio lib itself
function buildModfiles() {
  return compileTstl("src/tsconfig.json")
}

gulp.task(buildModfiles)

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
gulp.task(copyLuassert)

async function buildDefs() {
  const outFile = "index.d.ts"

  const fakeSrcDir = path.resolve(__dirname, "__testorio__")
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
gulp.task(buildDefs)

// files intended to be used by other mods.
function compileTestorio() {
  return compileTstl("src/testorio/tsconfig.json")
}
const buildTestorio = gulp.series(gulp.parallel(copyLuassert, buildDefs), compileTestorio)
gulp.task("buildTestorio", buildTestorio)

const buildMod = gulp.parallel(buildModfiles, buildTestorio)
gulp.task("buildMod", buildMod)

function buildFml() {
  return gulp
    .src("factorio-mod-linker/index.ts")
    .pipe(
      gulpTs({
        target: "ES2019",
        module: "es2020",
        moduleResolution: "node",
        strict: true,
        esModuleInterop: true,
      }),
    )
    .pipe(gulp.dest("factorio-mod-linker"))
}
gulp.task(buildFml)

function compileTestMod() {
  return compileTstl("testorio-test-mod/tsconfig.json")
}

gulp.task("buildTestMod", gulp.series(buildDefs, compileTestMod))
gulp.task("buildPackage", gulp.series(cleanAll, gulp.parallel(buildMod, buildFml)))
gulp.task(
  "buildAll",
  gulp.series(
    cleanAll,
    gulp.parallel(
      gulp.series(gulp.parallel(copyLuassert, buildDefs), gulp.parallel(compileTestorio, compileTestMod)),
      buildModfiles,
      buildFml,
    ),
  ),
)

function cleanMod() {
  return del(["src/!**!/!*.lua", "!src/say.lua", "!**!/luassert/!**", "!**!/!*.def.lua", "!**!/scenarios/!**"])
}
gulp.task("cleanMod", cleanMod)

function cleanAll() {
  return del([
    "src/!**!/!*.{lua,js}",
    "!**!/!*.def.lua",
    "!**/scenarios/!**",
    "!luassert/!**",
    "!say/!**",
    "index.d.ts",
  ])
}
