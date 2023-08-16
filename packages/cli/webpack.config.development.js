import { getLogger } from '@prosopo/common'
import { merge } from 'webpack-merge'
import { webpackConfigBase } from '@prosopo/config'
import path from 'path'

const logger = getLogger(`Info`, `webpack.config.js`)

logger.info(`Env is ${process.env.NODE_ENV}`)
const __dirname = process.cwd()

export default (env) => {
    env.BUNDLE_NAME = 'provider_cli_bundle'
    env.BASE_DIR = __dirname
    return merge(webpackConfigBase(env), {
        mode: 'development',
        entry: path.resolve(__dirname, './src/cli.ts'),
        target: 'node',
    })
}
