const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const webpack = require('webpack')
const path = require('path')
const { JsonAccessOptimizer } = require('webpack-json-access-optimizer')
const { ProvidePlugin, IgnorePlugin } = require('webpack')
const { loadEnv } = require('@prosopo/cli')
const { logger } = require('@prosopo/common')
const log = logger(`Info`, `webpack.config.js`)

const moduleDirs = [
    path.resolve(__dirname, 'node_modules'),
    path.resolve(__dirname, './api/node_modules'),
    path.resolve(__dirname, './datasets/node_modules'),
    path.resolve(__dirname, './procaptcha/node_modules'),
    path.resolve(__dirname, './procaptcha-react/node_modules'),
    path.resolve(__dirname, './provider/node_modules'),
    path.resolve(__dirname, './types/node_modules'),
]

log.info(`Env is ${process.env.NODE_ENV}`)

loadEnv()

module.exports = (env, argv) => {
    return {
        resolve: {
            extensions: ['.js', '.jsx', '.ts', '.tsx'],
            modules: moduleDirs,
            fullySpecified: false,
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
            new webpack.DefinePlugin({
                'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
                'process.env.PROTOCOL_CONTRACT_ADDRESS': JSON.stringify(process.env.PROTOCOL_CONTRACT_ADDRESS),
                'process.env.SUBSTRATE_NODE_URL': JSON.stringify(process.env.SUBSTRATE_NODE_URL),
            }),
            new ProvidePlugin({
                $t: './$tProvider',
            }),
            new JsonAccessOptimizer({
                accessorFunctionName: '$t', // i18n function name
            }),
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
    }
}
