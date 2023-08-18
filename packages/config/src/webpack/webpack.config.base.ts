import PluginJsonAccessOptimizer from 'webpack-json-access-optimizer'
const { JsonAccessOptimizer } = PluginJsonAccessOptimizer
import { excludePolkadot } from '../polkadot/index.js'
import { getLogger } from '@prosopo/common'
import CompressionPlugin from 'compression-webpack-plugin'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import i18nextWebpackPlugin from 'i18next-scanner-webpack'
import path from 'path'
import webpack from 'webpack'
const { IgnorePlugin, ProvidePlugin } = webpack

//set __dirname
const __dirname = path.resolve()
const log = getLogger(`Info`, `webpack.config.base.js`)
log.info(`dirname: ${__dirname}`)
const moduleDirs = [
    path.resolve(__dirname, 'node_modules'),
    path.resolve(__dirname, '../../node_modules'),
    path.resolve(__dirname, '../api/node_modules'),
    path.resolve(__dirname, '../common/node_modules'),
    path.resolve(__dirname, '../procaptcha/node_modules'),
    path.resolve(__dirname, '../procaptcha-react/node_modules'),
]

export function webpackConfigBase(env, argv) {
    const requiredEnv = ['BASE_DIR', 'BUNDLE_NAME']
    requiredEnv.forEach((envVar) => {
        if (!env[envVar]) {
            throw new Error(`${envVar} env var is required`)
        }
    })
    const alias = {}
    // get a list of polkdaot files to exclude from the bundle
    const externals = excludePolkadot()
    // alias the files to mock.js
    const mockFile = path.resolve(__dirname, '../config/dist/webpack/mock.js')
    externals.forEach((file) => {
        log.info(`resolving to mock.js: ${path.resolve(__dirname, 'mock.js')}`)
        alias[file] = mockFile
    })
    log.info(`Aliasing ${JSON.stringify(alias)}`)
    const isProduction = argv && argv.mode === 'production'
    log.info(`Production: ${isProduction}`)
    if (!env.BUNDLE_NAME) {
        throw new Error('BUNDLE_NAME env var is required')
    }
    const libraryName = env.BUNDLE_NAME
    const baseDir = env.BASE_DIR
    const target = 'web'
    const defineVars = {
        'process.env.NODE_ENV': process.env.NODE_ENV || JSON.stringify(isProduction ? 'production' : 'development'),
        'process.env.PROTOCOL_CONTRACT_ADDRESS': JSON.stringify(process.env.PROTOCOL_CONTRACT_ADDRESS),
        'process.env.SUBSTRATE_NODE_URL': JSON.stringify(process.env.SUBSTRATE_NODE_URL),
        'process.env.DEFAULT_ENVIRONMENT': JSON.stringify(process.env.DEFAULT_ENVIRONMENT),
        //only needed if bundling with a site key
        'process.env.PROSOPO_SITE_KEY': JSON.stringify(process.env.PROSOPO_SITE_KEY),
    }
    log.info(`Env vars: ${JSON.stringify(defineVars, null, 4)}`)
    return {
        snapshot: {
            managedPaths: [],
        },
        // when symlinks.resolve is false, we need this to make sure dev server picks up the changes in the symlinked files and rebuilds
        watchOptions: {
            followSymlinks: true,
            poll: true,
            ignored: /node_modules/,
        },
        target,
        resolve: {
            // Uncomment the following line when working with local packages
            // More reading : https://webpack.js.org/configuration/resolve/#resolvesymlinks
            symlinks: false,
            extensions: ['.js', '.jsx', '.ts', '.tsx'],
            modules: moduleDirs,
            fullySpecified: false,
            alias,
        },
        resolveLoader: {
            symlinks: false,
        },
        entry: path.resolve(baseDir, './src/index.tsx'),
        output: {
            filename: `${libraryName}.[name].bundle.js`,
            path: path.resolve(baseDir, 'dist'),
            library: libraryName,
            chunkFilename: `${libraryName}.[name].bundle.js`,
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
                            loader: 'css-loader',
                            options: {
                                url: false,
                            },
                        },
                    ],
                },

                //https://stackoverflow.com/a/69519812
                {
                    test: /\.m?js/,
                    resolve: {
                        fullySpecified: false,
                    },
                },
                {
                    test: /\.m?js/,
                    type: 'javascript/auto',
                },
                {
                    //exclude: /node_modules/,
                    test: /\.(ts|tsx)$/,
                    resolve: {
                        fullySpecified: false,
                    },
                    use: [
                        {
                            loader: 'ts-loader',
                            options: {
                                configFile: path.resolve(baseDir, './tsconfig.webpack.json'),
                                transpileOnly: true,
                                onlyCompileBundledFiles: false,
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

        plugins: [
            new webpack.NormalModuleReplacementPlugin(
                /(centrifuge-chain|kusama|node-template|shell|statemint|westend)\.js/,
                mockFile
            ),
            new HtmlWebpackPlugin({
                template: './src/index.html',
            }),
            //new BundleAnalyzerPlugin(),
            new webpack.DefinePlugin(defineVars),
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
            new IgnorePlugin({
                resourceRegExp: /.*centrifuge-chain|kusama|westend|node-template|shell|statemint|westend\.js$/,
                contextRegExp: /@polkadot\/types-known/,
            }),
            new i18nextWebpackPlugin({
                options: {
                    locales: ['en', 'rs'],
                    src: path.resolve(__dirname, '../../packages/common/src/locales'),
                },
                async: true,
            }),
        ],
        externalsPresets: { node: false }, // do not set this to true for web, it will break the build
        externals,
    }
}
