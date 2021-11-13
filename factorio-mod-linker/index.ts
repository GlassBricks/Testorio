#!/usr/bin/env node

import { program } from "commander"
import { cosmiconfig } from "cosmiconfig"
import * as fs from "fs/promises"
import { globby } from "globby"
import * as process from "process"
import * as path from "path"
import rr from "rimraf"
import * as util from "util"

const rimraf = util.promisify(rr)

program.showHelpAfterError()

const factoriorcHelp =
  "A .factoriorc(.json, .yml) config file should be present in this or any parent directory. " +
  "It should have the field mods_path with the path to the (destination) factorio mods folder. "
program
  .description("Creates symlinks for factorio mods for development.")
  .addHelpText(
    "after",
    "This create symlinks for all factorio mods found in a current directory to the factorio mods folder.\n" +
      "Mods are identified by an appropriate info.json file. \n" +
      factoriorcHelp,
  )
  .option("--config, -c", "manually specify .factoriorc config path")
  .argument("[mods-dir]", `Directory to look for mods. Default is current working directory.`)
  .action((modfilesDir: string, opts) => makeLinks(modfilesDir, opts.config))

program.parseAsync(process.argv).catch((error) => {
  console.error(error)
  process.exit(1)
})

interface InfoJson {
  name: string
  version: string
  [key: string]: unknown
}

interface FactorioConfig {
  mods_path: string
}

async function makeLinks(dir: string | undefined, configPath: string | undefined): Promise<void> {
  const config = getFactorioConfig(configPath)
  const existing = new Map<string, string>() // mod_version -> path
  const infoJsons = await globby("**/info.json", {
    cwd: dir,
    gitignore: true,
  })
  if (infoJsons.length === 0) {
    console.log("No mods (info.json files) found")
    return
  }
  const modsPath = (await config).mods_path
  const promises = infoJsons
    .map((p) => path.resolve(dir || ".", p))
    .map(async (infoJsonPath) => {
      if (infoJsonPath.includes("scenarios/")) return
      const modInfo = JSON.parse(await fs.readFile(infoJsonPath, "utf-8")) as InfoJson
      if (!modInfo) return
      const modId = `${modInfo.name}_${modInfo.version}`
      const destination = path.join(modsPath, modId)
      const existingModId = existing.get(modId)
      if (existingModId !== undefined) {
        console.warn(
          `Multiple info.jsons with same mod name and version (${modId}): ${existingModId}, ${infoJsonPath}. Only using ${existingModId}`,
        )
        return
      }
      existing.set(modId, infoJsonPath)
      const target = path.dirname(infoJsonPath)
      console.log(`Creating symlink from ${destination} to ${path.relative(".", target)}`)
      await rimraf(destination)
      await fs.symlink(target, destination)
    })
  await Promise.all(promises)
}

async function getFactorioConfig(configPath: string | undefined): Promise<FactorioConfig> {
  const result = configPath ? await cosmiconfig("factorio").load(configPath) : await cosmiconfig("factorio").search()
  if (!result) {
    throw new Error(".factoriorc not found. " + factoriorcHelp)
  }

  const config = result.config as {
    factorio_mods_path?: string
  }

  const getPath = (field: keyof typeof config): string => {
    const pathName = config[field]
    if (!pathName) {
      throw new Error(`${field} is missing from config file (${path.resolve(result.filepath)})`)
    }
    if (path.isAbsolute(pathName)) return pathName
    return path.resolve(path.dirname(result.filepath), pathName)
  }

  return {
    mods_path: getPath("factorio_mods_path"),
  }
}
