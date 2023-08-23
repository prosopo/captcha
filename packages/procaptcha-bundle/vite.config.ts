import * as path from 'path'
import { ViteFrontendConfig } from '@prosopo/config'
import { loadEnv } from '@prosopo/cli'

// load env using our util because vite loadEnv is not working for .env.development
loadEnv()

process.env.TS_NODE_PROJECT = path.resolve('./tsconfig.json')

export default ViteFrontendConfig('procaptcha-bundle', path.resolve(), './src/index.tsx')
