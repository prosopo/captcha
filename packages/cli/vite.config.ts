import * as path from 'path'
import { ViteBackendConfig } from '@prosopo/config'
import { loadEnv } from '@prosopo/cli'

// load env using our util because vite loadEnv is not working for .env.development
loadEnv()

process.env.TS_NODE_PROJECT = path.resolve('./tsconfig.json')
export default ViteBackendConfig('provider_cli_bundle', path.resolve(), './src/cli.ts')
