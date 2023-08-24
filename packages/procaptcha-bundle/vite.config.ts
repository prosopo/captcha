import * as path from 'path'
import { ViteFrontendConfig } from '@prosopo/config'
import { defineConfig } from 'vite'
import { loadEnv } from '@prosopo/cli'
// load env using our util because vite loadEnv is not working for .env.development
loadEnv()

// Vite doesn't find the tsconfig for some reason
process.env.TS_NODE_PROJECT = path.resolve('./tsconfig.json')

// Package specific config
const copyTo = '../../demos/client-bundle-example/src'
const bundleName = 'procaptcha_bundle'
const packageName = '@prosopo/procaptcha-bundle'
const entry = './src/index.tsx'
const copyOptions = copyTo
    ? {
          srcDir: './dist/bundle',
          destDir: copyTo,
          bundleName: bundleName,
      }
    : undefined

// Merge with generic frontend config
export default defineConfig(async ({ command, mode }) => {
    const frontendConfig = await ViteFrontendConfig(
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
