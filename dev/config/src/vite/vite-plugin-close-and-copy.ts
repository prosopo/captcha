import { Plugin } from 'vite'
import { getLogger } from '@prosopo/common'
import fs from 'node:fs'
import path from 'path'
const log = getLogger(`Info`, `config.vite.vite-plugin-close.js`)
export interface ClosePluginOptions {
    srcDir: string
    destDir: string
}
/**
 *   description: Closes Vite after the bundle has been build. Optionally copies the bundle to a different directory.
 *   @param { ClosePluginOptions } options - The options object
 **/
export default function VitePluginCloseAndCopy(options?: ClosePluginOptions): Plugin {
    const __dirname = path.resolve()
    return {
        name: 'close-plugin', // required, will show up in warnings and errors
        buildStart() {
            log.info('Bundle build started')
        },
        buildEnd(error) {
            log.info('Build end')
            if (error) {
                console.log(error)
                log.error(error)
            }
        },
        closeBundle() {
            if (options) {
                clearOutputDirJS(__dirname, options)
                for (const file of fs.readdirSync(path.resolve(__dirname, options.srcDir))) {
                    if (file.endsWith('js')) {
                        copyFile(__dirname, options, file)
                    }
                }
            }
            log.info('Bundle closed')
            process.exit(0)
        },
    }
}

function copyFile(__dirname: string, options: ClosePluginOptions, file: string) {
    const src = path.resolve(__dirname, options.srcDir, file)
    const dest = path.resolve(__dirname, options.destDir, file)
    fs.copyFileSync(src, dest)
    log.info(`Copied ${src} to ${dest}`)
}

function clearOutputDirJS(__dirname: string, options: ClosePluginOptions) {
    fs.readdirSync(path.resolve(__dirname, options.destDir)).map((filepath) => {
        if (filepath.endsWith('js')) fs.rmSync(filepath)
    })
}
