import { Compiler } from 'terser-webpack-plugin'
import { getLogger } from '@prosopo/common'

const log = getLogger(`Info`, `webpack.o.js`)

export class ExitPlugin {
    constructor() {
        log.info('ExitPlugin constructor')
    }

    /**
     * Apply the plugin
     */
    apply(compiler: Compiler): void {
        compiler.hooks.done.tap('DonePlugin', (stats) => {
            log.info('Compile is done !')
            setTimeout(() => {
                process.exit(0)
            })
        })
    }
}
