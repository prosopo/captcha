const { loadEnv } = require('@prosopo/cli')
const path = require('path')
const rootDir = path.resolve(__dirname, '.')
loadEnv(rootDir)
module.exports = (env, argv) => {
    return {
        target: 'node',
        resolve: {
            extensions: ['.js', '.jsx', '.ts', '.tsx'],
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
    }
}
