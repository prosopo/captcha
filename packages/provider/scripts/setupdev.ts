import {Environment} from '../src/env'
// @ts-ignore
import yargs from 'yargs'
import {CaptchaMerkleTree} from "../src/merkle";
import {Tasks} from "../src/tasks/tasks";
import {hexHash} from "../src/util"
import BN from "bn.js";
import {blake2AsHex, decodeAddress, encodeAddress} from "@polkadot/util-crypto";

require('dotenv').config()

const PROVIDER = {
    serviceOrigin: "http://localhost:8282",
    fee: 10,
    payee: "Provider",
    stake: 10,
    datasetFile: '/usr/src/data/captchas.json',
    datasetHash: undefined
}

const DAPP = {
    serviceOrigin: "http://localhost:9393",
    mnemonic: "//Ferdie",
    contractAccount: process.env.DAPP_CONTRACT_ADDRESS,
    optionalOwner: "5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL", //Ferdie's address
    fundAmount: 100
}

const DAPP_USER = {
    mnemonic: "//Charlie",
}


async function run() {
    const env = new Environment("//Alice");
    await env.isReady();
    if (process.env.PROVIDER_MNEMONIC) {
        await processArgs(env);
    }

    process.exit();
}

function processArgs(env) {
    return yargs
        .usage('Usage: $0 [global options] <command> [options]')
        .command('provider', 'Setup a Provider', (yargs) => {
                return yargs
            }, async (argv) => {
                // @ts-ignore
                const providerKeyringPair = env.network.keyring.addFromMnemonic(process.env.PROVIDER_MNEMONIC.toString());
                await sendFunds(env, providerKeyringPair.address, 'Provider', new BN("100000000000000000"));
                await setupProvider(env, providerKeyringPair.address)
            },
        )
        .command('dapp', 'Setup a Dapp', (yargs) => {
                return yargs
            }, async (argv) => {
                await setupDapp(env);
            },
        )
        .command('user', 'Submit and approve Dapp User solution commitments', (yargs) => {
                return yargs
                    .option('approve', {type: 'boolean', demand: false,})
                    .option('disapprove', {type: 'boolean', demand: false,})
            }, async (argv) => {
                const solutionHash = await setupDappUser(env);
                if (argv.approve || argv.disapprove) {
                    await approveOrDisapproveCommitment(env, solutionHash, argv.approve);
                }
            },
        )
        .argv
}

async function displayBalance(env, address, who) {
    const balance = await env.network.api.query.system.account(address);
    console.log(who, " Balance: ", balance.data.free.toHuman())
    return balance
}

async function sendFunds(env, address, who, amount) {
    console.log(`Sending ${amount} to ${address}`);

    let balance = await displayBalance(env, address, who);
    const signerAddresses = await env.network.getAddresses();
    // @ts-ignore
    const Alice = signerAddresses[0];
    await displayBalance(env, address, "Alice");
    let api = env.network.api;
    if (balance.data.free.isEmpty) {
        const alicePair = env.network.keyring.getPair(Alice);
        await env.patract.buildTx(
            api.registry,
            api.tx.balances.transfer(address, amount),
            alicePair.address // from
        );
        await displayBalance(env, address, who);
    }
}

async function setupProvider(env, address) {
    console.log("\n---------------\nSetup Provider\n---------------")
    await env.changeSigner(process.env.PROVIDER_MNEMONIC);
    const tasks = new Tasks(env);
    console.log(" - providerRegister")
    await tasks.providerRegister(hexHash(PROVIDER.serviceOrigin), PROVIDER.fee, PROVIDER.payee, address);
    console.log(" - providerStake")
    await tasks.providerUpdate(hexHash(PROVIDER.serviceOrigin), PROVIDER.fee, PROVIDER.payee, address, PROVIDER.stake);
    console.log(" - providerAddDataset")
    const datasetResult = await tasks.providerAddDataset(PROVIDER.datasetFile);
    console.log(JSON.stringify(datasetResult));
    PROVIDER.datasetHash = datasetResult[0]['args'][1];
}

async function setupDapp(env) {
    console.log("\n---------------\nSetup Dapp\n---------------")
    const tasks = new Tasks(env);
    await env.changeSigner(DAPP.mnemonic);
    console.log(" - dappRegister")
    if (typeof (DAPP.contractAccount) === "string") {
        let encodedAddress = encodeAddress(DAPP.optionalOwner);
        console.log(blake2AsHex(decodeAddress(DAPP.optionalOwner)));
        //let optionalOwner = new Option(env.network.registry, GenericAccountId,blake2AsHex(decodeAddress(DAPP.optionalOwner)))
        await tasks.dappRegister(hexHash(DAPP.serviceOrigin), DAPP.contractAccount, blake2AsHex(decodeAddress(DAPP.optionalOwner)));
        console.log(" - dappFund")
        await tasks.dappFund(DAPP.contractAccount, DAPP.fundAmount);
    } else {
        throw("DAPP_CONTRACT_ACCOUNT not set in environment variables");
    }
}

async function setupDappUser(env) {
    console.log("\n---------------\nSetup Dapp User\n---------------")
    await env.changeSigner(DAPP_USER.mnemonic);

    // This next section is doing everything that the ProCaptcha repo will eventually be doing in the client browser
    //   1. Get captcha JSON
    //   2. Add solution
    //   3. Send clear solution to Provider
    //   4. Send merkle tree solution to Blockchain
    const tasks = new Tasks(env);
    console.log(" - getCaptchaWithProof")
    const provider = await tasks.getProviderDetails(process.env.PROVIDER_ADDRESS!);
    if (provider) {
        const solved = await tasks.getCaptchaWithProof(provider.captcha_dataset_id, true, 1)
        const unsolved = await tasks.getCaptchaWithProof(provider.captcha_dataset_id, false, 1)
        solved[0].captcha.solution = [1];
        unsolved[0].captcha.solution = [1];
        // TODO add salt to solution https://github.com/prosopo-io/provider/issues/35
        console.log(" - build Merkle tree")
        let tree = new CaptchaMerkleTree();
        await tree.build([solved[0].captcha, unsolved[0].captcha]);
        // TODO send solution to Provider database https://github.com/prosopo-io/provider/issues/35
        await env.changeSigner(DAPP_USER.mnemonic);
        let captchaData = await tasks.getCaptchaData(provider.captcha_dataset_id.toString());
        if (captchaData.merkle_tree_root !== provider.captcha_dataset_id.toString()) {
            throw(`Cannot find captcha data id: ${provider.captcha_dataset_id.toString()}`);
        }
        let commitment_id = tree.root!.hash;
        console.log(" - dappUserCommit")
        if (typeof (DAPP.contractAccount) === "string" && typeof (process.env.PROVIDER_ADDRESS) === "string") {
            console.log(" -   Contract Account: ", DAPP.contractAccount);
            console.log(" -   Captcha Dataset ID: ", provider.captcha_dataset_id);
            console.log(" -   Solution Root Hash: ", commitment_id);
            console.log(" -   Provider Address: ", process.env.PROVIDER_ADDRESS);
            await tasks.dappUserCommit(DAPP.contractAccount, provider.captcha_dataset_id, commitment_id, process.env.PROVIDER_ADDRESS);
            let commitment = await tasks.getCaptchaSolutionCommitment(commitment_id);
            console.log("Commitment: ", commitment)
        } else {
            throw("Either DAPP_CONTRACT_ACCOUNT or PROVIDER_ADDRESS not set in environment variables");
        }
        return commitment_id

    } else {
        throw("Provider not found");
    }
}

async function approveOrDisapproveCommitment(env, solutionHash, approve: boolean) {
    console.log("\n---------------\nApprove or Disapprove Commitment\n---------------")
    const tasks = new Tasks(env);
    // This stage would take place on the Provider node after checking the solution was correct
    // We need to assume that the Provider has access to the Dapp User's merkle tree root or can construct it from the
    // raw data that was sent to them
    // TODO check solution is correct https://github.com/prosopo-io/provider/issues/35
    await env.changeSigner(process.env.PROVIDER_MNEMONIC);
    if (approve) {
        console.log("-   Approving commitment")
        await tasks.providerApprove(solutionHash);
    } else {
        console.log("-   Disapproving commitment")
        await tasks.providerDisapprove(solutionHash);
    }
}

run().catch((err) => {
    console.log(err);
    throw new Error(`Setup dev error`);
});