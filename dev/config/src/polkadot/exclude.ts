import { Alias } from 'vite'
import { getLogger } from '@prosopo/common'
import path from 'path'

const log = getLogger(`Info`, `config.polkadot.exclude.js`)
export function excludePolkadot() {
    //'bytes.js'] //...interfacesToIgnore]
    //const startDir = path.resolve(path.resolve(), '../../node_modules/@polkadot')
    //log.info(`startDir: ${startDir}`)
    //return getFilesInDirs(startDir, excludeFiles)
    return ['./kusama.js', './westend.js', './cjs/bytes.js']
}

export function getAliases(dir: string): Alias[] {
    const polkadotFilesToAlias = excludePolkadot()
    const alias: Alias[] = []
    // TODO Is there a way to determine this path by importing mock.js?
    const mockFile = path.resolve(dir, '../config/dist/polkadot/mock.js')
    polkadotFilesToAlias.forEach((file) => {
        log.info(`resolving ${file} to mock.js`)
        alias.push({ find: file, replacement: mockFile })
    })
    for (const pkg of ['api', 'api-contract', 'extension-dapp', 'types', 'util', 'util-crypto']) {
        alias.push({
            find: new RegExp(`/@polkadot/${pkg}$/`),
            replacement: path.resolve(dir, `../../node_modules/@polkadot/${pkg}/bundle-polkadot-${pkg}.js`),
        })
    }
    return alias
}
