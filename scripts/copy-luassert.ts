import cpy from "cpy"
import del from "del"
import * as fs from "fs"
import * as path from "path"

const repositories = path.resolve(__dirname, "..")
const outDir = path.resolve(__dirname, "../src")

async function copyLuassert() {
  const repo = path.join(repositories, "luassert")
  const src = path.join(repo, "src")
  const destination = path.join(outDir, "luassert")

  await Promise.all([
    (async () => {
      await del(["**/*", "!**/*.ts"], {
        cwd: destination,
      })
      await cpy("**/*.lua", destination, {
        cwd: src,
        parents: true,
      })
    })(),
    cpy("LICENSE", destination, {
      cwd: repo,
    }),
  ])
}

async function copySay() {
  const repo = path.join(repositories, "say")
  const destination = outDir
  await Promise.all([
    fs.promises.copyFile(path.join(repo, "src/init.lua"), path.join(destination, "say.lua")),
    fs.promises.copyFile(path.join(repo, "LICENSE"), path.join(destination, "say-LICENSE")),
  ])
}

Promise.all([copyLuassert(), copySay()]).catch((e) => {
  console.error(e)
  process.exit(1)
})
