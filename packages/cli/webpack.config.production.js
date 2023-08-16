/* eslint-disable @typescript-eslint/no-var-requires */
const TerserPlugin = require('terser-webpack-plugin')

export default () => {
    return {
        mode: 'production',
        extends: './webpack.config.development.js',

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
