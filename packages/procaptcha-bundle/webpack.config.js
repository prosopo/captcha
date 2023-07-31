/* eslint-disable @typescript-eslint/no-var-requires */
const HtmlWebpackPlugin = require('html-webpack-plugin')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
const CompressionPlugin = require('compression-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const webpack = require('webpack')
const TerserPlugin = require('terser-webpack-plugin')
const path = require('path')
const { JsonAccessOptimizer } = require('webpack-json-access-optimizer')
const { ProvidePlugin } = require('webpack')
const { loadEnv } = require('@prosopo/cli')
const { getLogger } = require('@prosopo/common')
const log = getLogger(`Info`, `webpack.config.js`)
const moduleDirs = [
    path.resolve(__dirname, 'node_modules'),
    path.resolve(__dirname, '../../node_modules'),
    path.resolve(__dirname, '../api/node_modules'),
    path.resolve(__dirname, '../common/node_modules'),
    path.resolve(__dirname, '../procaptcha/node_modules'),
    path.resolve(__dirname, '../procaptcha-react/node_modules'),
]

const allowList = [
    '@emotion/cache',
    '@emotion/react',
    '@emotion/serialize',
    '@emotion/styled',
    '@emotion/styled-engine',
    '@mui/base',
    '@mui/material',
    '@mui/private-theming',
    '@mui/react-transition-group',
    '@mui/styled-engine',
    '@mui/styles',
    '@mui/system',
    '@mui/types',
    '@mui/utils',
    '@polkadot/api',
    '@polkadot/api-augment',
    '@polkadot/api-base',
    '@polkadot/api-contract',
    '@polkadot/api-derive',
    '@polkadot/bn.js',
    '@polkadot/connect',
    '@polkadot/dist',
    '@polkadot/icons-material',
    '@polkadot/keyring',
    '@polkadot/lib',
    '@polkadot/rpc-augment',
    '@polkadot/rpc-core',
    '@polkadot/rpc-provider',
    '@polkadot/ss58-registry',
    '@polkadot/types',
    '@polkadot/types-augment',
    '@polkadot/types-codec',
    '@polkadot/types-create',
    '@polkadot/util',
    '@polkadot/util-crypto',
    '@polkadot/wasm-bridge',
    '@polkadot/wasm-crypto',
    '@polkadot/wasm-crypto-init',
    '@polkadot/x-bigint',
    '@popperjs/base',
    '@popperjs/core',
    '@substrate/connect',
    '@substrate/networks',
    '@substrate/rpc-provider',
    '@types/express-serve-static-core',
    '@types/material',
    '@types/qs',
    '@types/range-parser',
    '@types/react',
    '@types/react-dom',
    '@types/scheduler',
    '@types/send',
    '@types/types',
    '@types/util',
    'axios',
    'clsx',
    'consola/extension-inject',
    'csstype',
    'i18next',
    'i18next-http-middleware',
    'react',
    'react-dom',
    'react-i18next/mime',
    'rxjs/dist',
    'rxjs/types',
    'tslib',
    'zod',
]
// Create a regex that captures packages that are NOT in the allow list
const externalsRegex = `(?!${allowList.map((item) => item.replace('/', '\\/')).join('|')})`
log.info('externalsRegex', externalsRegex)

loadEnv()

module.exports = (env, argv) => {
    const isProduction = argv.mode === 'production'
    const libraryName = 'procaptcha_bundle'
    return {
        resolve: {
            extensions: ['.js', '.jsx', '.ts', '.tsx'],
            modules: moduleDirs,
            fullySpecified: false,
        },
        entry: './src/index.tsx',
        output: {
            filename: `${libraryName}.[name].bundle.js`,
            path: path.resolve(__dirname, 'dist'),
            library: libraryName,
            chunkFilename: `${libraryName}.[name].bundle.js`,
        },
        module: {
            rules: [
                {
                    include: /node_modules/,
                    test: /\.css$/,
                    resolve: {
                        fullySpecified: false,
                    },
                    sideEffects: true,
                    use: [
                        MiniCssExtractPlugin.loader,
                        {
                            loader: require.resolve('css-loader'),
                            options: {
                                url: false,
                            },
                        },
                    ],
                },
                {
                    //exclude: /(node_modules)/,
                    test: /\.(ts|tsx)$/,
                    resolve: {
                        fullySpecified: false,
                    },
                    use: [
                        {
                            loader: require.resolve('ts-loader'),
                            options: {
                                configFile: 'tsconfig.webpack.json',
                                transpileOnly: true,
                            },
                        },
                    ],
                },
                {
                    test: /locale\.json$/, // match JSON files to optimize
                    loader: 'webpack-json-access-optimizer',
                },
            ],
        },

        plugins: [
            new HtmlWebpackPlugin({
                template: './src/index.html',
            }),
            //new BundleAnalyzerPlugin(),
            new webpack.DefinePlugin({
                'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
                'process.env.PROTOCOL_CONTRACT_ADDRESS': JSON.stringify(process.env.PROTOCOL_CONTRACT_ADDRESS),
                'process.env.SUBSTRATE_NODE_URL': JSON.stringify(process.env.SUBSTRATE_NODE_URL),
                'process.env.DEFAULT_ENVIRONMENT': JSON.stringify(process.env.DEFAULT_ENVIRONMENT),
                'process.env.PROSOPO_SITE_KEY': JSON.stringify(process.env.PROSOPO_SITE_KEY),
            }),
            // new webpack.optimize.SplitChunksPlugin(),
            new CompressionPlugin(),
            new MiniCssExtractPlugin({
                filename: 'extr.[contenthash].css',
            }),
            new ProvidePlugin({
                $t: './$tProvider',
            }),
            new JsonAccessOptimizer({
                accessorFunctionName: '$t', // i18n function name
            }),
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
        optimization: {
            // chunkIds: 'deterministic',
            // runtimeChunk: 'single',
            // splitChunks: {
            //     cacheGroups: [
            //         // all other modules
            //         ['modu', /[\\/]node_modules[\\/]/],
            //     ].reduce(
            //         (result, [name, test], index) => ({
            //             ...result,
            //             [`cacheGroup${index}`]: {
            //                 chunks: 'initial',
            //                 enforce: true,
            //                 maxSize: 1_500_000,
            //                 minSize: 0,
            //                 name,
            //                 priority: -1 * index,
            //                 test,
            //             },
            //         }),
            //         {}
            //     ),
            // },
            noEmitOnErrors: true,
            minimize: isProduction,
            minimizer: isProduction
                ? [
                      new TerserPlugin({
                          terserOptions: {
                              compress: {
                                  drop_console: true,
                              },
                          },
                      }),
                  ]
                : undefined,
            usedExports: true,
        },
        externalsPresets: { node: false }, // do not set this to true, it will break the build
        externals: isProduction ? [externalsRegex] : undefined,
    }
}
