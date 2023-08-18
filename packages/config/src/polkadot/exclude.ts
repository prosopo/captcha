import { getFilesInDirs } from '../dependencies.js'
import { getLogger } from '@prosopo/common'
import path from 'path'
const log = getLogger(`Info`, `config.polkadot.exclude.js`)
export default function excludePolkadot() {
    const excludeFiles = ['kusama.js', 'westend.js'] //'bytes.js'] //...interfacesToIgnore]
    const startDir = path.resolve(__dirname, '../../node_modules/@polkadot')
    log.info(`startDir: ${startDir}`)
    return getFilesInDirs(startDir, excludeFiles)
}
