import { getLogger } from '@prosopo/common'

const log = getLogger(`Info`, `config.polkadot.exclude.js`)
export default function excludePolkadot() {
    //'bytes.js'] //...interfacesToIgnore]
    //const startDir = path.resolve(path.resolve(), '../../node_modules/@polkadot')
    //log.info(`startDir: ${startDir}`)
    //return getFilesInDirs(startDir, excludeFiles)
    return ['./kusama.js', './westend.js', 'bytes.js']
}
