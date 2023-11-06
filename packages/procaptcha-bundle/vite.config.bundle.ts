import * as fs from 'fs'
import * as path from 'path'
import { ViteBundleConfig } from '@prosopo/config'
import { defineConfig } from 'vite'
import { loadEnv } from '@prosopo/cli'
// load env using our util because vite loadEnv is not working for .env.development
loadEnv()

// Vite doesn't find the tsconfig for some reason
process.env.TS_NODE_PROJECT = path.resolve('./tsconfig.json')

// Package specific config
const copyTo = '../../demos/client-bundle-example/src'
//const bundleName = 'treeshakeTest'
const bundleName = 'procaptcha'
const packageName = '@prosopo/procaptcha-bundle'
const entry = 'procaptcha.bundle.js'
//const entry = 'treeshakeTest.js'
const copyOptions = copyTo
    ? {
          srcDir: './dist/bundle',
          destDir: copyTo,
          bundleName: bundleName,
      }
    : undefined
const tsConfigPaths = [path.resolve('./tsconfig.json')]
const packagesDir = path.resolve('..')
// Get all folders in packagesDir
const packages = fs.readdirSync(packagesDir).filter((f) => fs.statSync(path.join(packagesDir, f)).isDirectory())
for (const packageName of packages) {
    // Add the tsconfig for each package to tsConfigPaths
    tsConfigPaths.push(path.resolve(`../${packageName}/tsconfig.json`))
}
// Merge with generic frontend config
export default defineConfig(async ({ command, mode }) => {
    const frontendConfig = await ViteBundleConfig(
        packageName,
        bundleName,
        path.resolve(),
        entry,
        command,
        mode,
        copyOptions
    )
    return {
        ...frontendConfig,
    }
})
