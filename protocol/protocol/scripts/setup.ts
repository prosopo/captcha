import {network, patract} from "redspot";
import ProsopoDatabase from "../../provider/src/database";
import {Option, Text} from "@polkadot/types";
import {blake2AsU8a, mnemonicGenerate} from "@polkadot/util-crypto";
import definitions from '../scripts/types'

const {getContractFactory, getRandomSigner} = patract;
const {createSigner, keyring, api, getAddresses} = network;

async function run() {
    await api.isReady;


    console.log("");
    const db = new ProsopoDatabase(undefined, "prosopo")
    await db.connect();
    let details = await db.getContractDetails("prosopo");
    console.log(details);
    const contract = await patract.getContractAt("prosopo", details.address, details.owner);
    console.log(contract.address.toHuman());
    api.disconnect();
    const dappOwner = await getRandomSigner();
    const provider = await getRandomSigner();
    const mnemonic = mnemonicGenerate();
    console.log(mnemonic);
    const providerServiceOrigin = blake2AsU8a("https://localhost:2424", 256);
    const dappServiceOrigin = blake2AsU8a("https://localhost:2424", 256);
    const providerFee = 0;
    const registry = api.registry;
    await registry.register(definitions)
    await setupProvider(contract, provider, providerServiceOrigin, 1, registry);
    const {contractAccount} = await setupDapp(contract, provider.address, providerServiceOrigin, providerFee);
    console.log(contractAccount)
    process.exit();
}

async function setupDapp(contract, dappOwner, dappServiceOrigin, registry) {
    const dappSigner = contract.connect(dappOwner.address);
    const contractAccount = await getRandomSigner();
    await dappSigner.tx.dappRegister(dappServiceOrigin, contractAccount.address, new Option(registry, Text, undefined));
    const value = 7;
    await dappSigner.tx.dappFund(contractAccount.address, {gasLimit: "400000000000", value: value});
    return {contractAccount};
}

async function setupProvider(contract, provider, providerServiceOrigin, providerFee, registry) {
    console.log("Registering provider");
    await contract.tx.providerRegister(providerServiceOrigin, providerFee, 'Provider', provider.address);
    console.log("Registered provider");
    const value = 10;
    const providerSigner = contract.connect(provider.address);
    await providerSigner.tx.providerStake({"value": value, "signer": provider});
    const dataSetHash = blake2AsU8a("Captcha data set JSON");
    await providerSigner.tx.providerAddDataSet(dataSetHash, {"signer": provider})
    return {dataSetHash}
}

run().catch((err) => {
    console.log(err);
});