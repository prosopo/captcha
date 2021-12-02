import {Environment} from '../src/env'

require('dotenv').config()

async function run() {

    const env = new Environment();

    await env.isReady();

    let network = env.network;
    let patract = env.patract;
    let api = env.network.api;
    const signerAddresses = await network.getAddresses();
    const Alice = signerAddresses[0];

    // Send the provider some funds
    if (process.env.PROVIDER_MNEMONIC) {
        const providerKeyringPair = network.keyring.addFromMnemonic(process.env.PROVIDER_MNEMONIC.toString());
        let providerBalance = await displayBalance(env, providerKeyringPair.address, "Provider");
        await displayBalance(env, Alice, "Alice");
        // @ts-ignore
        if (providerBalance.data.free.toNumber() === 0) {
            const alicePair = network.keyring.getPair(Alice);
            await patract.buildTx(
                api.registry,
                api.tx.balances.transfer(providerKeyringPair.address, 1e15),
                alicePair.address // from
            );
            await displayBalance(env, providerKeyringPair.address, "Provider");
        }
    }

    process.exit();
}

async function displayBalance(env, address, who) {
    const balance = await env.network.api.query.system.account(address);
    console.log(who, " Balance: ", balance.data.free.toHuman())
    return balance
}

run().catch((err) => {
    throw new Error(`Setup dev error: ${err}`);
});