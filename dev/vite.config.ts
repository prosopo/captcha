import { ViteTestConfig } from '@prosopo/config'
import { loadEnv } from '@prosopo/util'
import path from 'path'
process.env.NODE_ENV = 'test'
loadEnv(path.resolve())

export default ViteTestConfig
