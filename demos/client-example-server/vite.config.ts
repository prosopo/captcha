import * as path from 'node:path'
import { loadEnv } from '@prosopo/cli'
import { ViteBackendConfig } from '@prosopo/config'
import { defineConfig } from 'vite'
import { version } from './package.json'

// load env using our util because vite loadEnv is not working for .env.development
loadEnv()

// Package specific config
const packageName = '@prosopo/client-example-server'
const packageVersion = version
const bundleName = 'prosopo_client_example_server'
const dir = path.resolve()
const entry = './src/app.ts'

process.env.TS_NODE_PROJECT = path.resolve('./tsconfig.json')

// Merge with generic backend config
export default defineConfig(async ({ command, mode }) => {
    const backendConfig = await ViteBackendConfig(packageName, packageVersion, bundleName, dir, entry, command, mode)
    return defineConfig({
        ...backendConfig,
        server: { port: process.env.PROSOPO_SERVER_PORT },
    })
})
