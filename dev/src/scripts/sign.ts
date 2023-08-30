import { cryptoWaitReady, sr25519PairFromSeed, sr25519Sign, sr25519Verify } from '@polkadot/util-crypto'

const main = async () => {
    const mnemonic = new Uint8Array(JSON.parse(process.argv[2]))

    const message = new Uint8Array(JSON.parse(process.argv[3]))

    console.log('mnemonic:', mnemonic)
    console.log('message:', message)

    await cryptoWaitReady()

    const pair = sr25519PairFromSeed(mnemonic)

    const sig = sr25519Sign(message, pair)
    console.log('sig:', sig)

    const valid = sr25519Verify(message, sig, pair.publicKey)
    console.log('valid:', valid)

    // await cryptoWaitReady()
    // const keyring = new Keyring({ type: 'sr25519' })
    // let account
    // if (typeof mnemonic === 'string') {
    //     account = keyring.addFromMnemonic(mnemonic)
    // } else {
    //     account = keyring.addFromSeed(mnemonic)
    // }
    // const signature = account.sign(message)
    // console.log(signature)
}

main()
