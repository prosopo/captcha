import {Option, Text} from "@polkadot/types";
import {blake2AsU8a} from "@polkadot/util-crypto";
import {Environment} from '../src/env'
require('dotenv').config()

async function run() {
    const env = new Environment();
    await env.network.api.isReady;
    let patract = env.patract;
    let network = env.network;
    let api = env.network.api;
    let registry = network.registry;
    const signerAddresses = await network.getAddresses();
    const Alice = signerAddresses[0];
    await env.isReady();
    const providerServiceOrigin = blake2AsU8a(env.config.provider!.serviceOrigin, 256);
    const providerFee = env.config.provider!.fee

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

    //await setupProvider(env.contract, env.providerSigner.address, providerServiceOrigin, 1, registry);
    //const {contractAccount} = await setupDapp(env.contract, env.providerSigner.address, providerServiceOrigin, providerFee);
    //console.log(contractAccount)
    process.exit();
}

// async function setupDapp(contract, dappOwner, dappServiceOrigin, registry) {
//     const dappSigner = contract.connect(dappOwner.address);
//     const contractAccount = await getRandomSigner();
//     await dappSigner.tx.dappRegister(dappServiceOrigin, contractAccount.address, new Option(registry, Text, undefined));
//     const value = 7;
//     await dappSigner.tx.dappFund(contractAccount.address, {gasLimit: "400000000000", value: value});
//     return {contractAccount};
// }

async function displayBalance(env, address, who) {
    const balance = await env.network.api.query.system.account(address);
    console.log(who , " Balance: ", balance.data.free.toHuman())
    return balance
}


async function setupProvider(contract, providerSigner, providerServiceOrigin, providerFee, registry) {
    console.log("Registering provider");
    await contract.tx.providerRegister(providerServiceOrigin, providerFee, 'Provider', providerSigner.address);
    console.log("Registered provider");
    const value = 10;
    const providerContract = contract.connect(providerSigner.address);
    await providerContract.tx.providerStake({"value": value, "signer": providerSigner});
    const dataSetHash = blake2AsU8a("Captcha data set JSON");
    await providerContract.tx.providerAddDataSet(dataSetHash, {"signer": providerSigner})
    return {dataSetHash}
}

run().catch((err) => {
    console.log(err);
});