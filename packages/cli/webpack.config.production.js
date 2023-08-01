/* eslint-disable @typescript-eslint/no-var-requires */
const TerserPlugin = require('terser-webpack-plugin')

module.exports = () => {
    return {
        extends: './webpack.config.base.js',

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
