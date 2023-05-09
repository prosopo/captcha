const HtmlWebpackPlugin = require('html-webpack-plugin')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
const CompressionPlugin = require('compression-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const webpack = require('webpack')
const TerserPlugin = require('terser-webpack-plugin')
const path = require('path')
const { JsonAccessOptimizer } = require('webpack-json-access-optimizer')
const { ProvidePlugin } = require('webpack')

module.exports = (env, argv) => {
    const isProduction = argv.mode === 'production'

    return {
        entry: './src/index.tsx',
        output: {
            filename: '[name].bundle.js',
            path: path.resolve(__dirname, 'dist'),
        },
        module: {
            rules: [
                // {
                //     test: /\.(ts|tsx)$/,
                //     exclude: /node_modules/,
                //     use: {
                //         loader: 'babel-loader',
                //         options: {
                //             presets: [
                //                 [
                //                     '@babel/preset-env',
                //                     {
                //                         targets: '> 0.25%, not dead',
                //                         modules: false,
                //                     },
                //                 ],
                //                 '@babel/preset-react',
                //                 '@babel/preset-typescript',
                //             ],
                //         },
                //     },
                // },
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
                    exclude: /(node_modules)/,
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
        resolve: {
            extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
        plugins: [
            new HtmlWebpackPlugin({
                template: './src/index.html',
            }),
            new BundleAnalyzerPlugin(),
            new webpack.DefinePlugin({
                'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
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
        ],
        devServer: {
            static: {
                directory: __dirname + '/dist',
            },
            compress: true,
            port: 9000,
        },
        externals: 'datasets',
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
            minimizer: [
                new TerserPlugin({
                    terserOptions: {
                        compress: {
                            drop_console: true,
                        },
                    },
                }),
            ],
            usedExports: true,
        },
    }
}
