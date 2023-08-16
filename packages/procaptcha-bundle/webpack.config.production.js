import { ExitPlugin, webpackConfigBase } from '@prosopo/config'
import { IgnorePlugin, TerserPlugin } from 'webpack'
import { getLogger } from '@prosopo/common'
import { merge } from 'webpack-merge'

const log = getLogger(`Info`, `webpack.config.production.js`)

export default function (env) {
    env.BUNDLE_NAME = 'procaptcha_bundle'
    env.BASE_DIR = __dirname
    log.debug(`env: ${JSON.stringify(env, null, 2)}`)
    return merge(webpackConfigBase(env), {
        mode: 'production',

        optimization: {
            minimize: true,
            minimizer: [
                new TerserPlugin({
                    terserOptions: {
                        compress: {
                            drop_console: true,
                            passes: 3,
                        },
                    },
                }),
            ],
            removeAvailableModules: true,
            removeEmptyChunks: true,
            mergeDuplicateChunks: true,
            flagIncludedChunks: true,
            sideEffects: true,
            providedExports: true,
            usedExports: true,
            concatenateModules: false,
            portableRecords: true,
            splitChunks: {
                cacheGroups: {
                    vendor: {
                        test: /[\\/]node_modules[\\/]/,
                        name: `vendor`,
                        chunks: 'all',
                    },
                },
            },
        },
        plugins: [
            // ignore react-dom-development.js
            new IgnorePlugin({ resourceRegExp: /.*react-dom\.development\.js$/, contextRegExp: /react-dom/ }),
            // ignore react-development.js
            new IgnorePlugin({ resourceRegExp: /.*react\.development\.js$/, contextRegExp: /react/ }),
            // exit on build done
            new ExitPlugin(),
        ],
    })
}
