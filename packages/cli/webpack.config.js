const HtmlWebpackPlugin = require('html-webpack-plugin')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
const CompressionPlugin = require('compression-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const webpack = require('webpack')
const TerserPlugin = require('terser-webpack-plugin')
const path = require('path')
const { JsonAccessOptimizer } = require('webpack-json-access-optimizer')
const { ProvidePlugin, IgnorePlugin } = require('webpack')
const { loadEnv } = require('@prosopo/cli')
const { logger } = require('@prosopo/common')
const log = logger(`Info`, `webpack.config.js`)
const fs = require('fs')

const moduleDirs = [
    path.resolve(__dirname, 'node_modules'),
    path.resolve(__dirname, '../../node_modules'),
    path.resolve(__dirname, '../captcha/node_modules'),
    path.resolve(__dirname, '../common/node_modules'),
    path.resolve(__dirname, '../procaptcha/node_modules'),
    path.resolve(__dirname, '../procaptcha-react/node_modules'),
]

console.log(`Env is ${process.env.NODE_ENV}`)

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
    const libraryName = 'provider_cli_bundle'
    return {
        target: 'node',
        resolve: {
            extensions: ['.js', '.jsx', '.ts', '.tsx'],
            modules: moduleDirs,
            fullySpecified: false,
        },
        entry: './src/cli.ts',
        output: {
            filename: `${libraryName}.[name].bundle.js`,
            path: path.resolve(__dirname, 'dist/bundle'),
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
                {
                    test: /\.node$/,
                    loader: 'node-loader',
                },
            ],
        },

        plugins: [
            //new BundleAnalyzerPlugin(),
            new webpack.DefinePlugin({
                'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
                'process.env.PROTOCOL_CONTRACT_ADDRESS': JSON.stringify(process.env.PROTOCOL_CONTRACT_ADDRESS),
                'process.env.SUBSTRATE_NODE_URL': JSON.stringify(process.env.SUBSTRATE_NODE_URL),
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
            // required to make sure that blessed packs properly
            new IgnorePlugin({ resourceRegExp: /pty.js/, contextRegExp: /blessed\/lib\/widgets$/ }),
            new IgnorePlugin({ resourceRegExp: /term.js/, contextRegExp: /blessed\/lib\/widgets$/ }),
            new IgnorePlugin({ resourceRegExp: /API\/schema/, contextRegExp: /pm2\/lib\/tools$/ }),
            new IgnorePlugin({ resourceRegExp: /deploy$/, contextRegExp: /pm2-deploy$/ }),
            // makes sure webpack exits
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
        //externals: isProduction ? [externalsRegex] : undefined,
        externalsPresets: { node: true },
    }
}
