import * as fs from 'node:fs'
import * as path from 'node:path'
import { loadEnv } from '@prosopo/cli'
import { ViteFrontendConfig } from '@prosopo/config'
import { defineConfig } from 'vite'
// load env using our util because vite loadEnv is not working for .env.development
loadEnv()

// Vite doesn't find the tsconfig for some reason
process.env.TS_NODE_PROJECT = path.resolve('./tsconfig.json')

// Package specific config
const copyTo = ['../../demos/client-bundle-example/src']
const bundleName = 'procaptcha'
const packageName = '@prosopo/procaptcha-bundle'
const entry = './src/index.tsx'
const copyOptions = copyTo
    ? {
          srcDir: './dist/bundle',
          destDir: copyTo,
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
    const frontendConfig = await ViteFrontendConfig(
        packageName,
        bundleName,
        path.resolve(),
        entry,
        command,
        mode,
        copyOptions,
        tsConfigPaths
    )
    return {
        ...frontendConfig,
    }
})
