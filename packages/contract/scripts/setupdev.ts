import {Environment} from '../src/env'
// @ts-ignore
import yargs from 'yargs'
import {CaptchaMerkleTree} from "../src/merkle";
import {Tasks} from "../src/tasks/tasks";
import BN from "bn.js";

require('dotenv').config()

const PROVIDER = {
    serviceOrigin: "http://localhost:8282",
    fee: 10,
    payee: "Provider",
    stake: 10,
    datasetFile: '/usr/src/data/captchas.json',
    datasetHash: ""
}

const DAPP = {
    serviceOrigin: "http://localhost:9393",
    mnemonic: "//Ferdie",
    contractAccount: "",
    optionalOwner: "",
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
    await displayBalance(env, address, Alice);
    let api = env.network.api;
    if (balance.data.free.toNumber() === 0) {
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
    await tasks.providerRegister(PROVIDER.serviceOrigin, PROVIDER.fee, PROVIDER.payee, address);
    console.log(" - providerStake")
    await tasks.providerUpdate(PROVIDER.serviceOrigin, PROVIDER.fee, PROVIDER.payee, address, PROVIDER.stake);
    console.log(" - providerAddDataset")
    const datasetResult = await tasks.providerAddDataset(PROVIDER.datasetFile);
    console.log(datasetResult);
    PROVIDER.datasetHash = datasetResult[0]['args'][1];
}

async function setupDapp(env) {
    console.log("\n---------------\nSetup Dapp\n---------------")
    const tasks = new Tasks(env);
    await env.changeSigner(DAPP.mnemonic);
    console.log(" - dappRegister")
    await tasks.dappRegister(DAPP.serviceOrigin, DAPP.contractAccount, DAPP.optionalOwner)
    console.log(" - dappFund")
    await tasks.dappFund(DAPP.contractAccount, DAPP.fundAmount);
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
        console.log(" - dappUserCommit")
        await tasks.dappUserCommit(DAPP.contractAccount, PROVIDER.datasetHash, tree.root!.hash);
        return tree.root!.hash;

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
    console.log(" - getCaptchaSolutionCommitment")
    console.log(solutionHash);
    const commitment = await tasks.getCaptchaSolutionCommitment(solutionHash, PROVIDER.datasetHash);
    console.log(commitment);
    console.log(" - Captcha solution commitment \n", commitment);
    if (approve) {
        await tasks.providerApprove(commitment);
    } else {
        await tasks.providerDisapprove(commitment);
    }
}

run().catch((err) => {
    console.log(err);
    throw new Error(`Setup dev error`);
});