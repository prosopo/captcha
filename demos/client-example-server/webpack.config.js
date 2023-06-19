const { loadEnv } = require('@prosopo/cli')
const { logger } = require('@prosopo/common')
const path = require('path')
const rootDir = path.resolve(__dirname, '.')
const webpack = require('webpack')
loadEnv(rootDir)
const log = logger(process.env.LOG_LEVEL || 'info', 'webpack.config.js')
const mode = process.env.NODE_ENV || 'development'
log.log('Mode:', mode)
module.exports = (env, argv) => {
    const libraryName = 'prosopo_client_example_server'
    return {
        target: 'node',
        resolve: {
            extensions: ['.js', '.jsx', '.ts', '.tsx'],
            fallback: {},
        },
        entry: './src/app.ts',
        output: {
            filename: `${libraryName}.[name].bundle.js`,
            path: path.resolve(__dirname, 'dist'),
            library: libraryName,
            chunkFilename: `${libraryName}.[name].bundle.js`,
        },
        devServer: {
            port: process.env.REACT_APP_SERVER_PORT,
        },
        module: {
            rules: [
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
            ],
        },
        // kill the process once compilation is done if in production mode, otherwise serve the bundle
        plugins: [
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
            new webpack.DefinePlugin({
                'process.env.REACT_APP_API_PATH_PREFIX': JSON.stringify(
                    process.env.REACT_APP_API_PATH_PREFIX || '/v1/prosopo'
                ),
                'process.env.REACT_APP_DAPP_CONTRACT_ADDRESS': JSON.stringify(
                    process.env.REACT_APP_DAPP_CONTRACT_ADDRESS || ''
                ),
                'process.env.REACT_APP_SUBSTRATE_NODE_URL': JSON.stringify(
                    process.env.REACT_APP_SUBSTRATE_NODE_URL || 'ws://localhost:9944'
                ),
                'process.env.REACT_APP_PROSOPO_CONTRACT_ADDRESS': JSON.stringify(
                    process.env.REACT_APP_PROSOPO_CONTRACT_ADDRESS || ''
                ),
                'process.env.REACT_APP_WEB2': JSON.stringify(process.env.REACT_APP_WEB2 || 'true'),
                'process.env.DEFAULT_ENVIRONMENT': JSON.stringify(process.env.DEFAULT_ENVIRONMENT || 'development'),
                'process.env.REACT_APP_SERVER_MNEMONIC': JSON.stringify(
                    process.env.REACT_APP_SERVER_MNEMONIC || '//Bob'
                ),
                'process.env.REACT_APP_SERVER_URL': JSON.stringify(
                    process.env.REACT_APP_SERVER_URL || 'https://localhost'
                ),
                'process.env.REACT_APP_SERVER_PORT': JSON.stringify(process.env.REACT_APP_SERVER_PORT || '7272'),
                'process.env.LOG_LEVEL': JSON.stringify(process.env.LOG_LEVEL || 'info'),
                'process.env.REACT_APP_SOLUTION_THRESHOLD': JSON.stringify(
                    process.env.REACT_APP_SOLUTION_THRESHOLD || '80'
                ),
            }),
        ],
        externals: [
            {
                'utf-8-validate': 'commonjs utf-8-validate',
                bufferutil: 'commonjs bufferutil',
                'aws-crt': 'commonjs aws-crt',
                'mongodb-client-encryption': 'commonjs mongodb-client-encryption',
                aws4: 'commonjs aws4',
                'bson-ext': 'commonjs bson-ext',
                kerberos: 'commonjs kerberos',
                '@mongodb-js/zstd': 'commonjs @mongodb-js/zstd',
                snappy: 'commonjs snappy',
                'snappy/package.json': 'commonjs snappy/package.json',
            },
        ],
    }
}
