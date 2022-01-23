import {Tasks} from "../../src/tasks/tasks";
import {hexHash} from "../../src/util";
import {blake2AsHex, decodeAddress, encodeAddress} from "@polkadot/util-crypto";
import {CaptchaMerkleTree} from "../../src/merkle";
import {computeCaptchaSolutionHash, convertCaptchaToCaptchaSolution} from "../../src/captcha";
import {Hash} from "@polkadot/types/interfaces";

export async function displayBalance(env, address, who) {
    const balance = await env.network.api.query.system.account(address);
    console.log(who, " Balance: ", balance.data.free.toHuman())
    return balance
}

export async function sendFunds(env, address, who, amount): Promise<void> {
    console.log(`Sending ${amount} to ${address}`);
    let balance = await displayBalance(env, address, who);
    const signerAddresses = await env.network.getAddresses();
    // @ts-ignore
    const Alice = signerAddresses[0];
    const alicePair = env.network.keyring.getPair(Alice);
    await displayBalance(env, alicePair.address, "Alice");
    let api = env.network.api;
    if (balance.data.free.isEmpty) {
        await env.patract.buildTx(
            api.registry,
            api.tx.balances.transfer(address, amount),
            alicePair.address // from
        );
        await displayBalance(env, address, who);
    }
    return
}

export async function setupProvider(env, address, provider): Promise<Hash> {
    console.log("\n---------------\nSetup Provider\n---------------")
    await env.changeSigner(provider.mnemonic);
    const tasks = new Tasks(env);
    console.log(" - providerRegister")
    await tasks.providerRegister(hexHash(provider.serviceOrigin), provider.fee, provider.payee, provider.address);
    console.log(" - providerStake")
    await tasks.providerUpdate(hexHash(provider.serviceOrigin), provider.fee, provider.payee, address, provider.stake);
    console.log(" - providerAddDataset")
    const datasetResult = await tasks.providerAddDataset(provider.datasetFile);
    console.log(JSON.stringify(datasetResult));
    return datasetResult[0]['args'][1]
}

export async function setupDapp(env, dapp): Promise<void> {
    console.log("\n---------------\nSetup Dapp\n---------------")
    const tasks = new Tasks(env);
    await env.changeSigner(dapp.mnemonic);
    console.log(" - dappRegister")
    if (typeof (dapp.contractAccount) === "string") {
        await tasks.dappRegister(hexHash(dapp.serviceOrigin), dapp.contractAccount, blake2AsHex(decodeAddress(dapp.optionalOwner)));
        console.log(" - dappFund")
        await tasks.dappFund(dapp.contractAccount, dapp.fundAmount);
    } else {
        throw("DAPP_CONTRACT_ACCOUNT not set in environment variables");
    }
}

export async function setupDappUser(env, dapp_user, provider, dapp): Promise<string> {
    console.log("\n---------------\nSetup Dapp User\n---------------")
    await env.changeSigner(dapp_user.mnemonic);

    // This section is doing everything that the ProCaptcha repo will eventually be doing in the client browser
    //   1. Get captcha JSON
    //   2. Add solution
    //   3. Send merkle tree solution to Blockchain
    //   4. Send clear solution to Provider
    const tasks = new Tasks(env);
    console.log(" - getCaptchaWithProof")
    const providerOnChain = await tasks.getProviderDetails(provider.address!);
    if (providerOnChain) {
        const solved = await tasks.getCaptchaWithProof(providerOnChain.captcha_dataset_id, true, 1)
        const unsolved = await tasks.getCaptchaWithProof(providerOnChain.captcha_dataset_id, false, 1)
        solved[0].captcha.solution = [2, 3, 4];
        unsolved[0].captcha.solution = [1];
        solved[0].captcha.salt = "0xuser1";
        unsolved[0].captcha.salt = "0xuser2";
        // TODO add salt to solution https://github.com/prosopo-io/provider/issues/35
        console.log(" - build Merkle tree")
        let tree = new CaptchaMerkleTree();
        let captchas = [solved[0].captcha, unsolved[0].captcha];
        let captchaSols = captchas.map(captcha => convertCaptchaToCaptchaSolution(captcha));
        let captchaSolHashes = captchaSols.map(computeCaptchaSolutionHash)
        await tree.build(captchaSolHashes);
        // TODO send solution to Provider database https://github.com/prosopo-io/provider/issues/35
        await env.changeSigner(dapp_user.mnemonic);
        let captchaData = await tasks.getCaptchaData(providerOnChain.captcha_dataset_id.toString());
        if (captchaData.merkle_tree_root !== providerOnChain.captcha_dataset_id.toString()) {
            throw(`Cannot find captcha data id: ${providerOnChain.captcha_dataset_id.toString()}`);
        }
        let commitment_id = tree.root!.hash;
        console.log(" - dappUserCommit")
        if (typeof (dapp.contractAccount) === "string" && typeof (provider.address) === "string") {
            console.log(" -   Contract Account: ", dapp.contractAccount);
            console.log(" -   Captcha Dataset ID: ", providerOnChain.captcha_dataset_id);
            console.log(" -   Solution Root Hash: ", commitment_id);
            console.log(" -   Provider Address: ", provider.address);
            console.log(" -   Captchas: ", captchas);
            await tasks.dappUserCommit(dapp.contractAccount, providerOnChain.captcha_dataset_id, commitment_id, provider.address);
            let commitment = await tasks.getCaptchaSolutionCommitment(commitment_id);
            console.log("Commitment: ", commitment)
            //TODO 4. Send clear solution to Provider (tasks.dappUserSolution)
        } else {
            throw("Either DAPP_CONTRACT_ACCOUNT or PROVIDER_ADDRESS not set in environment variables");
        }
        return commitment_id

    } else {
        throw("Provider not found");
    }
}

export async function approveOrDisapproveCommitment(env, solutionHash, approve: boolean, provider) {
    console.log("\n---------------\nApprove or Disapprove Commitment\n---------------")
    const tasks = new Tasks(env);
    // This stage would take place on the Provider node after checking the solution was correct
    // We need to assume that the Provider has access to the Dapp User's merkle tree root or can construct it from the
    // raw data that was sent to them
    // TODO check solution is correct https://github.com/prosopo-io/provider/issues/35
    await env.changeSigner(provider.mnemonic);
    if (approve) {
        console.log(" -   Approving commitment")
        await tasks.providerApprove(solutionHash);
    } else {
        console.log(" -   Disapproving commitment")
        await tasks.providerDisapprove(solutionHash);
    }
}