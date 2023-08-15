import PluginJsonAccessOptimizer from 'webpack-json-access-optimizer'
const { JsonAccessOptimizer } = PluginJsonAccessOptimizer
import { getLogger } from '@prosopo/common'
import { loadEnv } from '@prosopo/cli'
import CompressionPlugin from 'compression-webpack-plugin'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import fs from 'node:fs'
import glob from 'glob'
import i18nextWebpackPlugin from 'i18next-scanner-webpack'
import path from 'path'
import webpack from 'webpack'
const { IgnorePlugin, ProvidePlugin } = webpack

//set __dirname
const __dirname = path.resolve()

const log = getLogger(`Info`, `webpack.config.js`)
log.info(`dirname: ${__dirname}`)
const moduleDirs = [
    path.resolve(__dirname, 'node_modules'),
    path.resolve(__dirname, '../../node_modules'),
    path.resolve(__dirname, '../api/node_modules'),
    path.resolve(__dirname, '../common/node_modules'),
    path.resolve(__dirname, '../procaptcha/node_modules'),
    path.resolve(__dirname, '../procaptcha-react/node_modules'),
]

const allowList = [
    '@emotion',
    '@mui/base',
    '@mui/material',
    '@mui/private-theming',
    '@mui/react-transition-group',
    '@mui/styled-engine',
    '@mui/styles',
    '@mui/system',
    '@mui/types',
    '@mui/utils',
    '@noble',
    '@polkadot/api',
    '@polkadot/api-augment',
    '@polkadot/api-base',
    '@polkadot/api-contract',
    '@polkadot/api-derive',
    '@polkadot/bn.js',
    '@polkadot/connect',
    '@polkadot/dist',
    '@polkadot/extension-dapp',
    '@polkadot/icons-material',
    '@polkadot/keyring',
    '@polkadot/lib',
    '@polkadot/networks',
    '@polkadot/rpc-augment',
    '@polkadot/rpc-core',
    '@polkadot/rpc-provider',
    '@polkadot/ss58-registry',
    '@polkadot/types',
    '@polkadot/types-augment',
    '@polkadot/types-codec',
    '@polkadot/types-create',
    '@polkadot/util',
    '@polkadot/util-crypto',
    '@polkadot/wasm-bridge',
    '@polkadot/wasm-crypto',
    '@polkadot/wasm-crypto-init',
    '@polkadot/wasm-util',
    '@polkadot/x-bigint',
    '@polkadot/x-global',
    '@polkadot/x-randomvalues',
    '@popperjs/base',
    '@popperjs/core',
    '@prosopo',
    '@substrate/connect',
    '@substrate/networks',
    '@substrate/rpc-provider',
    '@types/express-serve-static-core',
    '@types/material',
    '@types/qs',
    '@types/range-parser',
    '@types/react',
    '@types/react-dom',
    '@types/scheduler',
    '@types/send',
    '@types/types',
    '@types/util',
    'axios',
    'clsx',
    'consola/extension-inject',
    'csstype',
    'i18next',
    'i18next-http-middleware',
    'react',
    'react-dom',
    'react-i18next/mime',
    'rxjs/dist',
    'rxjs/types',
    'scheduler',
    'seedrandom',
    'stylis',
    'tslib',
    'zod',
]

const interfacesToIgnore = [
    // api-derive
    'alliance',
    'bagsList',
    'bounties',
    'council',
    // types/interfaces
    'assets',
    'attestations',
    'aura',
    'author',
    'authorship',
    'beefy',
    'benchmark',
    'blockbuilder',
    'bridges',
    'childstate',
    'claims',
    'collective',
    'crowdloan',
    'cumulus',
    'democracy',
    'dev',
    'discovery',
    'elections',
    'eth',
    'evm',
    'fungibles',
    'genericAsset',
    'gilt',
    'identity',
    'imOnline',
    'lottery',
    'mmr',
    'nfts',
    'nimbus',
    'nompools',
    'offchain',
    'offences',
    'ormlOracle',
    'ormlTokens',
    'parachains',
    'payment',
    'poll',
    'pow',
    'proxy',
    'purchase',
    'recovery',
    'scaleInfo',
    'scheduler',
    'session',
    'society',
    'staking',
    'state',
    'support',
    'syncstate',
    'treasury',
    'uniques',
    'vesting',
    'xcm',
]
// Takes an array of partial module directories, finds the full path, and returns an array containing the file paths
// of the files contained within the matching module directories [ filePath, filePath, ... ]
function getFilesInDirs(startDir, excludeDirs = [], includeDirs = []) {
    const emptyAliases = []
    log.info(`getFilesInDirs: ${startDir} excluding ${excludeDirs} including ${includeDirs}`)
    const ignorePatterns = includeDirs.map((dir) => `${startDir}/**/${dir}`)
    excludeDirs.forEach((searchPattern) => {
        // get matching module directories
        const globPattern = `${startDir}/**/${searchPattern}${searchPattern.indexOf('.') > -1 ? '' : '/*'}`
        log.info(`globPattern: ${globPattern}`)
        const globResult = glob.sync(globPattern, { recursive: true, ignore: ignorePatterns })
        log.info(`globResult: ${globResult}`)
        for (const filePath of globResult) {
            emptyAliases.push(filePath)
            //log.info(`ignoring ${filePath}`)
        }
    })
    return emptyAliases
}

function excludeMui() {
    const includeDirs = [
        'Autocomplete',
        'Box',
        'Button',
        'Checkbox',
        'Fade',
        'Link',
        'styles',
        'TextField',
        'Typography',
        'utils',
    ]
    const startDir = path.resolve(__dirname, '../../node_modules/@mui/material')
    log.info(`startDir: ${startDir}`)
    return getFilesInDirs(startDir, ['*'], includeDirs)
}

function excludePolkadot() {
    const excludeFiles = ['kusama.js', 'westend.js'] //'bytes.js'] //...interfacesToIgnore]
    const startDir = path.resolve(__dirname, '../../node_modules/@polkadot')
    log.info(`startDir: ${startDir}`)
    return getFilesInDirs(startDir, excludeFiles)
}
const externals = excludePolkadot()

// Create a regex that captures packages that are in the allow list
// const packagesDir = path.resolve(__dirname, '../../packages')
// // DO NOT USE global flag here
// const allowedPackagesRegex = new RegExp(
//     `(${packagesDir}|${allowList.map((item) => item.replace('/', '\\/')).join('|')})+`
// )
// if (!allowedPackagesRegex.test(packagesDir)) {
//     throw new Error('Regex is not working')
// }
loadEnv()

// function externalsFn({ context, request }, callback) {
//     const filePath = `${context}${request.replace(':', '/').replace('./', '/')}`
//     if (allowedPackagesRegex.test(context) || allowedPackagesRegex.test(request)) {
//         //Continue without externalizing the import
//         return callback()
//     } else {
//         log.warn(`Externalizing ${filePath}`)
//         // Externalize the request
//         return callback(null, 'module' + request)
//     }
// }

//const excludedFiles = [...excludePolkadot()]
// make an alias object from the array of files to exclude
const alias = {}

externals.forEach((file) => {
    alias[file] = path.resolve(__dirname, 'mock.js')
})
log.info(`alias ${JSON.stringify(alias)}`)

export default (env, argv) => {
    const isProduction = argv && argv.mode === 'production'
    //const externals = isProduction ? [externalsFn] : undefined
    log.info(`Production: ${isProduction}`)
    const libraryName = 'procaptcha_bundle'
    const defineVars = {
        // TODO decide on what NODE_ENV is for
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
            //ignored: /node_modules/,
        },
        target: 'web',
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
        entry: path.resolve(__dirname, './src/index.tsx'),
        output: {
            filename: `${libraryName}.[name].bundle.js`,
            path: path.resolve(__dirname, 'dist'),
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
                    //exclude: /node_modules/,
                    test: /\.(ts|tsx)$/,
                    resolve: {
                        fullySpecified: false,
                    },
                    use: [
                        {
                            loader: 'ts-loader',
                            options: {
                                configFile: 'tsconfig.webpack.json',
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
                path.resolve(__dirname, 'mock.js')
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
            {
                apply: (compiler) => {
                    compiler.hooks.done.tap('DonePlugin', (stats) => {
                        log.info('Compile is done !')
                        if (process.env.WEBPACK_COPY === 'true') {
                            for (const file of fs.readdirSync(path.resolve(__dirname, './dist'))) {
                                if (file.startsWith('procaptcha_bundle') && file.endsWith('.js')) {
                                    fs.copyFileSync(
                                        path.resolve(__dirname, `./dist/${file}`),
                                        path.resolve(__dirname, `../../demos/client-bundle-example/src/${file}`)
                                    )
                                }
                            }
                        }
                    })
                },
            },
        ],
        externalsPresets: { node: false }, // do not set this to true, it will break the build
        externals,
    }
}
