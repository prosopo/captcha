/* tslint:disable */
/* eslint-disable */
/* prettier-ignore */

// Loader for the single target this package builds (see `napi.targets`).
// The @napi-rs/cli in this workspace does not emit its own multi-platform
// loader, so this is hand-maintained: adding a target to package.json means
// adding a branch here.

const { existsSync } = require('fs')
const { join } = require('path')

const { platform, arch } = process

if (platform !== 'linux' || arch !== 'x64') {
  throw new Error(
    `@prosopo/native-puzzle: unsupported platform ${platform}-${arch} (built for linux-x64 only)`,
  )
}

const local = join(__dirname, 'index.linux-x64-gnu.node')
if (!existsSync(local)) {
  throw new Error(
    '@prosopo/native-puzzle: index.linux-x64-gnu.node missing — run `npm run -w @prosopo/native-puzzle build`',
  )
}

module.exports = require(local)
