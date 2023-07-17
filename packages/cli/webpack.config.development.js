const path = require('path')
const { loadEnv } = require('@prosopo/cli')
const { logger } = require('@prosopo/common')
const { IgnorePlugin } = require('webpack')
const log = logger(`Info`, `webpack.config.development.js`)

log.info(`Env is ${process.env.NODE_ENV}`)

loadEnv()

module.exports = (env, argv) => {
    const libraryName = 'provider_cli_bundle'
    return {
        extends: '../../webpack.config.base.js',
        target: 'node',
        entry: './src/cli.ts',
        output: {
            filename: `${libraryName}.[name].bundle.js`,
            path: path.resolve(__dirname, 'dist/bundle'),
            library: libraryName,
            chunkFilename: `${libraryName}.[name].bundle.js`,
        },

        plugins: [
            // required to make sure that blessed packs properly
            new IgnorePlugin({ resourceRegExp: /pty.js/, contextRegExp: /blessed\/lib\/widgets$/ }),
            new IgnorePlugin({ resourceRegExp: /term.js/, contextRegExp: /blessed\/lib\/widgets$/ }),
            new IgnorePlugin({ resourceRegExp: /API\/schema/, contextRegExp: /pm2\/lib\/tools$/ }),
            new IgnorePlugin({ resourceRegExp: /deploy$/, contextRegExp: /pm2-deploy$/ }),
            new IgnorePlugin({ resourceRegExp: /mock-aws-s3$/, contextRegExp: /node-pre-gyp\/lib\/util$/ }),
        ],
        externalsPresets: { node: true },
        externals: {
            bcrypt: 'commonjs bcrypt',
        },
    }
}
