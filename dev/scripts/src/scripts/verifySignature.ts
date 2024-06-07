import { defaultConfig } from '@prosopo/cli'
import { getPairAsync } from '@prosopo/contract'
import { u8aToHex } from '@polkadot/util'
import { verifySignature } from '@prosopo/provider'
async function run(dappSignature: string, blockNumber: number | string, dappSecret: string) {
    const config = defaultConfig()
    const network = config.networks[config.defaultNetwork]
    const dappPair = await getPairAsync(network, dappSecret)

    const dappSignatureNew = dappPair.sign(blockNumber.toString())
    const signatureHexNew = u8aToHex(dappSignatureNew)
    console.log(signatureHexNew)

    verifySignature(signatureHexNew, blockNumber.toString(), dappPair)
    //verifySignature(dappSignature, blockNumber.toString(), dappPair)
}
run(
    '0x5e79f132e4ca7e4cc0515e09a4679c5fc23e15b3bff3a3b5905289cd8fe93b0d33449e35c6d9d9c1467e40fa0ec46dafbdc790392f1f1eef07fa8ec1dac47c8a',
    5481849, //6337707,
    'devote damp merge air fix knee lawn claim edit invite confirm dad'
)
    .then(console.log)
    .catch(console.error)
