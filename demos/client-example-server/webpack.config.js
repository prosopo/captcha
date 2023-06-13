const { loadEnv } = require('@prosopo/cli')
const path = require('path')
const rootDir = path.resolve(__dirname, '.')
loadEnv(rootDir)
module.exports = (env, argv) => {
    const libraryName = 'prosopo_client_example_server_bundle'
    return {
        watch: false,
        target: 'node',
        resolve: {
            extensions: ['.js', '.jsx', '.ts', '.tsx'],
            fallback: {
                'aws-crt': false,
                'mongodb-client-encryption': false,
                aws4: false,
                'bson-ext': false,
                kerberos: false,
                '@mongodb-js/zstd': false,
                snappy: false,
                'snappy/package.json': false,
                bufferutil: false,
                'utf-8-validate': false,
            },
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
        ],
        // externals: [
        //     'mongodb-client-encryption',
        //     'bson-ext',
        //     'kerberos',
        //     '@mongodb-js/zstd',
        //     'snappy',
        //     'snappy/package.json',
        //     'bufferutil',
        //     'utf-8-validate',
        // ],
    }
}
