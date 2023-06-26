const { loadEnv } = require('@prosopo/cli')
const path = require('path')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const InterpolateHtmlPlugin = require('interpolate-html-plugin')
const PUBLIC_URL = process.env.PUBLIC_URL || '/'
const libraryName = 'prosopo_client_example_bundle'
const mode = 'production'
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const TerserPlugin = require('terser-webpack-plugin')

// plugin that exits the process once compilation is done
const donePlugin = {
    apply: (compiler) => {
        compiler.hooks.done.tap('DonePlugin', (stats) => {
            console.log('Compile is done !')
            setTimeout(() => {
                process.exit(0)
            })
        })
    },
}

// plugins that are only used in production
const productionPlugins = [new MiniCssExtractPlugin(), donePlugin]

loadEnv()
module.exports = (env, argv) => {
    return {
        mode: mode,
        target: 'web',
        resolve: {
            extensions: ['.js', '.jsx', '.ts', '.tsx'],
            fallback: {},
        },
        entry: './src/index.tsx',
        output: {
            filename: `${libraryName}.[name].bundle.js`,
            path: path.resolve(__dirname, 'dist'),
            library: libraryName,
            chunkFilename: `${libraryName}.[name].bundle.js`,
            publicPath: PUBLIC_URL,
        },
        module: {
            rules: [
                {
                    test: /\.html$/i,
                    loader: 'html-loader',
                    options: {},
                },
                {
                    test: /\.jpg$/,
                    type: 'asset/resource',
                },
                {
                    // If you enable `experiments.css` or `experiments.futureDefaults`, please uncomment line below
                    // type: "javascript/auto",
                    test: /\.(sa|sc|c)ss$/i,
                    use: [MiniCssExtractPlugin.loader, 'css-loader', 'postcss-loader', 'sass-loader'],
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
            ],
        },
        plugins: [
            ...productionPlugins,
            new InterpolateHtmlPlugin({ PUBLIC_URL: '' }),
            new HtmlWebpackPlugin({
                template: './public/index.html',
                filename: './index.html',
                favicon: './public/favicon-32x32.png',
            }),
            new webpack.DefinePlugin({
                'process.env.PUBLIC_URL': PUBLIC_URL,
                'process.env.REACT_APP_SERVER_URL': JSON.stringify(
                    process.env.REACT_APP_SERVER_URL || 'http://localhost:9228'
                ),
                'process.env.REACT_APP_WEB2': JSON.stringify(process.env.REACT_APP_WEB2 || 'true'),
                'process.env.REACT_APP_SUBSTRATE_ENDPOINT': JSON.stringify(
                    process.env.REACT_APP_SUBSTRATE_ENDPOINT || 'http://localhost:9944'
                ),
                'process.env.REACT_APP_PROSOPO_CONTRACT_ADDRESS': JSON.stringify(
                    process.env.REACT_APP_PROSOPO_CONTRACT_ADDRESS || ''
                ),
                'process.env.REACT_APP_DAPP_SITE_KEY': JSON.stringify(process.env.REACT_APP_DAPP_SITE_KEY || ''),
            }),
            new TerserPlugin({
                terserOptions: {
                    compress: {
                        drop_console: true,
                    },
                },
            }),
        ],
    }
}
