const fs = require('fs')
const path = require('path')
const nodeExternals = require('webpack-node-externals')
const dependencyTree = require('dependency-tree')
const detective = require('detective-typescript')

class AllowListPlugin {
    apply(compiler) {
        compiler.hooks.beforeCompile.tapAsync('AllowListPlugin', (params, callback) => {
            // These are paths that could be input vars instead
            const filePath = '/home/user/prosopo/monorepo/packages/procaptcha-react/src/index.tsx'
            const dirPath = '/home/user/prosopo/monorepo/packages/procaptcha-react'

            // Get the dependency list from the dependency-tree
            const depList = dependencyTree.toList({
                filename: filePath,
                directory: dirPath,
                webpack: true,
                detective: detective,
            })

            // Filter out only node_modules dependencies
            const allowlist = depList
                .filter((dep) => dep.includes('node_modules'))
                .map((dep) => {
                    // Remove the 'node_modules/' prefix, file extension and last part of the path
                    const withoutPrefix = dep.replace(/.*node_modules\//, '')
                    const withoutSuffix = withoutPrefix.replace(/\.d\.ts$/, '')
                    const withoutLastPart = withoutSuffix.replace(/\/[^/]*$/, '')
                    return withoutLastPart
                })

            // Convert to set to remove dupes
            const allowlistSet = new Set(allowlist)
            const allowlistArray = Array.from(allowlistSet)

            console.log(allowlistArray) // Debugging

            // If static_mode argument is provided, write the allowlist to a JSON file and stop
            if (process.argv.includes('--static_mode')) {
                fs.writeFileSync('allowlist.json', JSON.stringify(allowlistArray, null, 2))
                console.log('Allowlist saved to allowlist.json')
                callback()
                return
            }

            // Otherwise, update the webpack configuration
            params.options.externals = [
                nodeExternals({
                    importType: 'umd',
                    modulesDir: path.resolve(__dirname, '../../node_modules'),
                    allowlist: allowlistArray,
                }),
            ]

            callback()
        })
    }
}

module.exports = AllowListPlugin
