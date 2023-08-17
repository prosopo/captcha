// var stripNodeColonPlugin = {
//     name: 'strip-node-colon',
//     setup({ onResolve, onLoad }) {
//         onResolve({ filter: /^node:/ }, args => {
//             return { path: args.path.slice('node:'.length), external: true }
//         })
//     }
// }
import { Compiler } from 'terser-webpack-plugin'
import { getLogger } from '@prosopo/common'

const log = getLogger(`Info`, `webpack.o.js`)

export class StripNodePrefixPlugin {
    constructor() {
        log.info('StripNodePrefixPlugin constructor')
    }

    /**
     * Apply the plugin
     */
    apply(compiler: Compiler): void {
        compiler.resolverFactory.hooks.resolver.for('[type]').tap('name', (resolver) => {
            // you can tap into resolver.hooks now
            console.log(resolver)
            resolver.hooks.result.tap('MyPlugin', (result) => {
                return result
            })
        })
    }
}
