import * as path from 'path'
import { ViteBackendConfig } from '@prosopo/config'
import { defineConfig } from 'vite'
import { loadEnv } from '@prosopo/cli'
import { version } from './package.json'

// load env using our util because vite loadEnv is not working for .env.development
loadEnv()

// Package specific config
const packageName = '@prosopo/cli'
const bundleName = 'provider'
const dir = path.resolve()
const entry = './src/cli.ts'
const packageVersion = version

process.env.TS_NODE_PROJECT = path.resolve('./tsconfig.json')

// Merge with generic backend config
export default defineConfig(async ({ command, mode }) => {
    const backendConfig = await ViteBackendConfig(packageName, packageVersion, bundleName, dir, entry, command, mode)
    return defineConfig({
        define: {
            ...backendConfig.define,
            'process.env._DEV_ONLY_ATLAS_URI': JSON.stringify(process.env._DEV_ONLY_ATLAS_URI),
            'process.env._DEV_ONLY_WATCH_EVENTS': JSON.stringify(process.env._DEV_ONLY_WATCH_EVENTS),
        },
        ...backendConfig,
    })
})
