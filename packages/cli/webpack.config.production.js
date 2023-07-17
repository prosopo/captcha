const TerserPlugin = require('terser-webpack-plugin')
const CompressionPlugin = require('compression-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')

module.exports = () => {
    return {
        extends: './webpack.config.development.js',
        plugins: [
            new CompressionPlugin(),
            new MiniCssExtractPlugin({
                filename: 'extr.[contenthash].css',
            }),
        ],
        optimization: {
            minimize: true,
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
        externalsPresets: { node: true },
    }
}
