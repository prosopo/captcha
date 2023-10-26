import { Alias } from 'vite'
import { getLogger } from '@prosopo/common'
import fs from 'fs'
import path from 'path'

// List of interfaces to replace with mock. The interface is required if commented out.
const POLKADOT_INTERFACES = [
    './assetConversion/definitions.js',
    './assets/definitions.js',
    './attestations/definitions.js',
    './aura/definitions.js',
    './author/definitions.js',
    './authorship/definitions.js',
    './babe/definitions.js',
    // './balances/definitions.js',
    './beefy/definitions.js',
    './benchmark/definitions.js',
    './blockbuilder/definitions.js',
    './bridges/definitions.js',
    // './chain/definitions.js',
    './childstate/definitions.js',
    './claims/definitions.js',
    './collective/definitions.js',
    './consensus/definitions.js',
    // './contracts/definitions.js',
    // './contractsAbi/definitions.js',
    './crowdloan/definitions.js',
    './cumulus/definitions.js',
    './democracy/definitions.js',
    './dev/definitions.js',
    './discovery/definitions.js',
    './elections/definitions.js',
    './engine/definitions.js',
    './eth/definitions.js',
    './evm/definitions.js',
    // './extrinsics/definitions.js',
    './finality/definitions.js',
    './fungibles/definitions.js',
    './genericAsset/definitions.js',
    './gilt/definitions.js',
    './grandpa/definitions.js',
    './identity/definitions.js',
    './imOnline/definitions.js',
    './lottery/definitions.js',
    //'./metadata/definitions.js',
    './mmr/definitions.js',
    './nfts/definitions.js',
    './nimbus/definitions.js',
    './nompools/definitions.js',
    './offchain/definitions.js',
    './offences/definitions.js',
    './ormlOracle/definitions.js',
    './ormlTokens/definitions.js',
    './parachains/definitions.js',
    './payment/definitions.js',
    './poll/definitions.js',
    './pow/definitions.js',
    './proxy/definitions.js',
    './purchase/definitions.js',
    './recovery/definitions.js',
    // './rpc/definitions.js',
    // './runtime/definitions.js',
    //'./scaleInfo/definitions.js',
    './scheduler/definitions.js',
    './session/definitions.js',
    './society/definitions.js',
    './staking/definitions.js',
    //'./state/definitions.js',
    './support/definitions.js',
    './syncstate/definitions.js',
    // './system/definitions.js',
    './treasury/definitions.js',
    './txpayment/definitions.js',
    './txqueue/definitions.js',
    './uniques/definitions.js',
    //'./utility/definitions.js',
    './vesting/definitions.js',
    './xcm/definitions.js',
]

const POLKADOT_UPGRADES = [
    './centrifuge-chain.js',
    './kusama.js',
    './node.js',
    './node-template.js',
    './polkadot.js',
    './shell.js',
    './statemint.js',
    './westend.js',
]

const log = getLogger(`Info`, `config.polkadot.exclude.js`)

function replaceImportsWithBundles(dir: string): Alias[] {
    const alias: Alias[] = []
    // read folders in folder ../../node_modules/@polkadot
    // for each folder, check if there is a bundle and use it in our bundle instead of the original source files
    fs.readdirSync(path.resolve(dir, '../../node_modules/@polkadot')).forEach((pkg) => {
        // if is directory
        const filePath = path.resolve(dir, `../../node_modules/@polkadot/${pkg}`)
        if (fs.lstatSync(filePath).isDirectory()) {
            //if bundle file exists in filePath
            const bundleFile = path.resolve(filePath, `bundle-polkadot-${pkg}.js`)
            if (fs.existsSync(bundleFile)) {
                alias.push({
                    find: new RegExp(`/@polkadot/${pkg}$/`),
                    replacement: bundleFile,
                })
            }
        }
    })
    return alias
}

export function getAliases(dir: string): Alias[] {
    const alias: Alias[] = []

    const mockUpgrade = path.resolve(dir, '../../dev/config/dist/polkadot/mockUpgrade.js')
    const mockInterface = path.resolve(dir, '../../dev/config/dist/polkadot/mockInterface.js')

    POLKADOT_UPGRADES.forEach((file) => {
        log.info(`resolving ${file} to mockUpgrade.js`)
        alias.push({ find: file, replacement: mockUpgrade })
    })
    POLKADOT_INTERFACES.forEach((file) => {
        log.info(`resolving ${file} to mockInterface.js`)
        alias.push({ find: file, replacement: mockInterface })
    })
    // The below code makes no difference to the output size - not sure why.
    // alias.concat(replaceImportsWithBundles(dir))

    return alias
}
