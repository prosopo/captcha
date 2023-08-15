import { loadEnv } from '@prosopo/cli'
import glob from 'glob'
import path from 'path'

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
const externalsRegex = `(?!${allowList.map((item) => item.replace('/', '\\/')).join('|')})`

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
function getFilesInDirs(startDir, excludeDirs: string[] = [], includeDirs: string[] = []) {
    const emptyAliases: string[] = []
    console.info(`getFilesInDirs: ${startDir} excluding ${excludeDirs} including ${includeDirs}`)
    const ignorePatterns = includeDirs.map((dir) => `${startDir}/**/${dir}`)
    excludeDirs.forEach((searchPattern) => {
        // get matching module directories
        const globPattern = `${startDir}/**/${searchPattern}${searchPattern.indexOf('.') > -1 ? '' : '/*'}`
        console.info(`globPattern: ${globPattern}`)
        const globResult = glob.sync(globPattern, { recursive: true, ignore: ignorePatterns })
        console.info(`globResult: ${globResult}`)
        for (const filePath of globResult) {
            emptyAliases.push(filePath)
            //console.info(`ignoring ${filePath}`)
        }
    })
    return emptyAliases
}

function getExcludedFilePaths() {
    const excludeFiles = [
        'react.development.js',
        'react-dom.development.js',
        'kusama.js',
        'westend.js',
        'bytes.js',
        ...interfacesToIgnore,
    ]
    const startDir = path.resolve(__dirname, '../../node_modules/@polkadot')
    console.info(`startDir: ${startDir}`)
    return getFilesInDirs(startDir, excludeFiles)
}

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
//         console.warn(`Externalizing ${filePath}`)
//         // Externalize the request
//         return callback(null, 'module' + request)
//     }
// }

const excludedFiles = [...getExcludedFilePaths()]
// make an alias object from the array of files to exclude
// const alias = {
//     '/home/chris/dev/prosopo/captcha/node_modules/@polkadot/types/cjs/interfaces/scheduler/definitions.js': false,
//     '/home/chris/dev/prosopo/captcha/node_modules/@polkadot/types/cjs/interfaces/scheduler/index.js': false,
//     '/home/chris/dev/prosopo/captcha/node_modules/@polkadot/types/cjs/interfaces/scheduler/types.js': false,
//     '/home/chris/dev/prosopo/captcha/node_modules/@polkadot/types/interfaces/scheduler/definitions.d.ts': false,
//     '/home/chris/dev/prosopo/captcha/node_modules/@polkadot/types/interfaces/scheduler/definitions.js': false,
//     '/home/chris/dev/prosopo/captcha/node_modules/@polkadot/types/interfaces/scheduler/index.d.ts': false,
//     '/home/chris/dev/prosopo/captcha/node_modules/@polkadot/types/interfaces/scheduler/index.js': false,
//     '/home/chris/dev/prosopo/captcha/node_modules/@polkadot/types/interfaces/scheduler/types.d.ts': false,
//     '/home/chris/dev/prosopo/captcha/node_modules/@polkadot/types/interfaces/scheduler/types.js': false,
// }
const alias = {}
excludedFiles.forEach((file) => {
    alias[file] = false
})

export default {
    optimizeDeps: {
        include: ['linked-dep'],
    },
    build: {
        type: 'module',
        lib: {
            entry: path.resolve(__dirname, './src/index.tsx'),
            formats: ['umd'],
            name: 'procaptcha_bundle',
        },
        rollupOptions: {
            external: externalsRegex,
            treeshake: 'smallest',
            exclude: [...excludedFiles],
        },
        resolve: {
            alias,
            //modules: [path.resolve(__dirname, '../node_modules')],
        },
    },

    plugins: [
        // commonjs({
        //     include: /packages\/.*\/dist/,
        //     requireReturnsDefault: 'auto', // <---- this solves default issue
        // }),
    ],
}
