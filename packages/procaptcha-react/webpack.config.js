const HtmlWebpackPlugin = require('html-webpack-plugin')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
const CompressionPlugin = require('compression-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const webpack = require('webpack')
const TerserPlugin = require('terser-webpack-plugin')
const path = require('path')
const { JsonAccessOptimizer } = require('webpack-json-access-optimizer')
const { ProvidePlugin } = require('webpack')
const { loadEnv } = require('@prosopo/env')
const nodeExternals = require('webpack-node-externals')

console.log([
    path.resolve(__dirname, 'node_modules'),
    path.resolve(__dirname, '../../node_modules'),
    path.resolve(__dirname, '../common/node_modules'),
])

loadEnv()

module.exports = (env, argv) => {
    const isProduction = argv.mode === 'production'
    const libraryName = 'procaptcha_react'
    return {
        resolve: {
            extensions: ['.js', '.jsx', '.ts', '.tsx'],
            modules: [
                path.resolve(__dirname, 'node_modules'),
                path.resolve(__dirname, '../../node_modules'),
                path.resolve(__dirname, '../common/node_modules'),
            ],
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
                        console.log('Compile is done !')
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
        externals: [
            nodeExternals({
                importType: 'umd',
                modulesDir: path.resolve(__dirname, '../../node_modules'),
                // this WILL include polkadot and prosopo packages to be bundled
                allowlist: [
                    '@babel/runtime/helpers/classPrivateFieldLooseBase',
                    '@babel/runtime/helpers/classPrivateFieldLooseKey',
                    '@babel/runtime/helpers/interopRequireDefault',
                    '@fingerprintjs/fingerprintjs',
                    '@mui/icons-material/Check',
                    '@mui/material',
                    '@mui/material/Box',
                    '@mui/material/Button',
                    '@mui/material/Checkbox',
                    '@mui/material/Fade',
                    '@mui/material/Link',
                    '@mui/material/styles/createTheme',
                    '@mui/material/styles/ThemeProvider',
                    '@mui/material/Typography',
                    '@mui/private-theming/useTheme',
                    '@mui/styles/useTheme',
                    '@noble/hashes/blake2b',
                    '@noble/hashes/hmac',
                    '@noble/hashes/pbkdf2',
                    '@noble/hashes/scrypt',
                    '@noble/hashes/sha256',
                    '@noble/hashes/sha3',
                    '@noble/hashes/sha512',
                    '@noble/secp256k1',
                    '@polkadot/api',
                    '@polkadot/api-derive',
                    '@polkadot/api-derive/cjs/packageInfo',
                    '@polkadot/extension-base/page/Signer',
                    '@polkadot/extension-dapp',
                    '@polkadot/keyring',
                    '@polkadot/networks',
                    '@polkadot/networks/cjs/packageInfo',
                    '@polkadot/rpc-augment',
                    '@polkadot/rpc-core',
                    '@polkadot/rpc-core/cjs/packageInfo',
                    '@polkadot/rpc-provider',
                    '@polkadot/rpc-provider/cjs/packageInfo',
                    '@polkadot/rpc-provider/ws',
                    '@polkadot/types',
                    '@polkadot/types/cjs/packageInfo',
                    '@polkadot/types-known',
                    '@polkadot/types-known/cjs/packageInfo',
                    '@polkadot/util',
                    '@polkadot/util/cjs/packageInfo',
                    '@polkadot/util-crypto',
                    '@polkadot/util-crypto/cjs/packageInfo',
                    '@polkadot/util-crypto/mnemonic/bip39',
                    '@polkadot/wasm-crypto',
                    '@polkadot/x-bigint',
                    '@polkadot/x-bigint/cjs/shim',
                    '@polkadot/x-global',
                    '@polkadot/x-randomvalues',
                    '@polkadot/x-textdecoder',
                    '@polkadot/x-textencoder',
                    '@prosopo/api/src/api/ProviderApi',
                    '@prosopo/common',
                    '@prosopo/contract',
                    '@prosopo/procaptcha',
                    '@scure/base',
                    'axios',
                    'bn.js',
                    'consola',
                    'ed2curve',
                    'eventemitter3',
                    'i18next',
                    'i18next-browser-languagedetector',
                    'i18next-http-backend',
                    'i18next-http-middleware',
                    'react',
                    'react-dom',
                    'react-i18next',
                    'react-jsx',
                    'rxjs',
                    'tslib',
                    'tweetnacl',
                ],
            }),
        ],
    }
}
