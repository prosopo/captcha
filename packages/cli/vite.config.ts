import * as path from 'path'
import { ViteBackendConfig } from '@prosopo/config'
import { defineConfig } from 'vite'
import { loadEnv } from '.'

// load env using our util because vite loadEnv is not working for .env.development
loadEnv()

// Package specific config
const packageName = '@prosopo/cli'
const bundleName = 'provider_cli_bundle'
const dir = path.resolve()
const entry = './src/cli.ts'

process.env.TS_NODE_PROJECT = path.resolve('./tsconfig.json')

// Merge with generic backend config
export default defineConfig(async ({ command, mode }) => {
    const backendConfig = await ViteBackendConfig(packageName, bundleName, dir, entry, command, mode)
    return defineConfig({
        ...backendConfig,
    })
})
