import { IgnorePlugin } from 'webpack'
import { getLogger } from '@prosopo/common'
import { merge } from 'webpack-merge'
import common from './webpack.config.base.js'
import path from 'path'
//set __dirname
const __dirname = path.resolve()
console.log(common)
console.log(__dirname)
const log = getLogger(`Info`, `webpack.config.js`)
export default merge(common(), {
    mode: 'production',
    optimization: {
        minimize: true,
        // minimizer: [
        //     new TerserPlugin({
        //         terserOptions: {
        //             compress: {
        //                 drop_console: true,
        //                 passes: 3,
        //             },
        //         },
        //     }),
        // ],
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
        {
            apply: (compiler) => {
                compiler.hooks.done.tap('DonePlugin', (stats) => {
                    log.info('Compile is done !')
                    setTimeout(() => {
                        process.exit(0)
                    })
                })
            },
        },
    ],
})
