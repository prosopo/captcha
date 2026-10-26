/* tslint:disable */
/* eslint-disable */
/* prettier-ignore */

// Loader for the single target this package builds (see `napi.targets`).
// The @napi-rs/cli in this workspace does not emit its own multi-platform
// loader, so this is hand-maintained: adding a target to package.json means
// adding a branch here. The require stays a string literal so the cli bundle's
// native-file plugin can swap it for the copy it places beside the bundle.

const { platform, arch } = process

if (platform !== 'linux' || arch !== 'x64') {
  throw new Error(
    `@prosopo/native-ja4: unsupported platform ${platform}-${arch} (built for linux-x64 only)`,
  )
}

try {
  module.exports = require('./dist/native/prosopo-native-ja4.linux-x64-gnu.node')
} catch (cause) {
  throw new Error(
    '@prosopo/native-ja4: cannot load dist/native/prosopo-native-ja4.linux-x64-gnu.node — run `pnpm --filter @prosopo/native-ja4 run build:native`',
    { cause },
  )
}
