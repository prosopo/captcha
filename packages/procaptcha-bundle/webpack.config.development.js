import { getLogger } from '@prosopo/common'
import { merge } from 'webpack-merge'
import { webpackConfigBase } from '@prosopo/config'
import fs from 'node:fs'
import path from 'path'

const __dirname = process.cwd()
const log = getLogger(`Info`, `webpack.config.development.js`)
export default (env) => {
    env.BUNDLE_NAME = 'procaptcha_bundle'
    env.BASE_DIR = __dirname
    return merge(webpackConfigBase(env), {
        mode: 'development',
        entry: path.resolve(__dirname, './src/index.tsx'),
        plugins: [
            {
                apply: (compiler) => {
                    compiler.hooks.done.tap('DonePlugin', (stats) => {
                        log.info('Compile is done !')
                        if (process.env.WEBPACK_COPY === 'true') {
                            for (const file of fs.readdirSync(path.resolve(__dirname, './dist'))) {
                                if (file.startsWith(env.BUNDLE_NAME) && file.endsWith('.js')) {
                                    const src = path.resolve(__dirname, `./dist/${file}`)
                                    const dest = path.resolve(
                                        __dirname,
                                        `../../demos/client-bundle-example/src/${file}`
                                    )
                                    fs.copyFileSync(src, dest)
                                    log.info(`Copied ${src} to ${dest}`)
                                }
                            }
                        }
                    })
                },
            },
        ],
    })
}
