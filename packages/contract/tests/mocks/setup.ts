import { Tasks } from '../../src/tasks/tasks'
import { hexHash } from '../../src/util'
import { blake2AsHex, decodeAddress, encodeAddress } from '@polkadot/util-crypto'
import { CaptchaMerkleTree } from '../../src/merkle'
import { computeCaptchaSolutionHash, convertCaptchaToCaptchaSolution } from '../../src/captcha'
import { Hash } from '@polkadot/types/interfaces'
import { DatasetWithIds, Provider } from '../../src/types'
import { TestAccount, TestDapp, TestProvider } from './accounts'

export async function displayBalance (env, address, who) {
    const balance = await env.network.api.query.system.account(address)
    console.log(who, ' Balance: ', balance.data.free.toHuman())
    return balance
}

export async function sendFunds (env, address, who, amount): Promise<void> {
    console.log(`Sending ${amount} to ${address}`)
    const balance = await displayBalance(env, address, who)
    const signerAddresses: string[] = await env.network.getAddresses()
    const Alice = signerAddresses[0]
    const alicePair = env.network.keyring.getPair(Alice)
    await displayBalance(env, alicePair.address, 'Alice')
    const api = env.network.api
    if (balance.data.free.isEmpty) {
        await env.patract.buildTx(
            api.registry,
            api.tx.balances.transfer(address, amount),
            alicePair.address // from
        )
        await displayBalance(env, address, who)
    }
}

export async function setupProvider (env, address:string, provider: TestProvider): Promise<Hash> {
    console.log('\n---------------\nSetup Provider\n---------------')
    await env.changeSigner(provider.mnemonic)
    const tasks = new Tasks(env)
    console.log(' - providerRegister')
    await tasks.providerRegister(hexHash(provider.serviceOrigin), provider.fee, provider.payee, provider.address)
    console.log(' - providerStake')
    await tasks.providerUpdate(hexHash(provider.serviceOrigin), provider.fee, provider.payee, address, provider.stake)
    console.log(' - providerAddDataset')
    const datasetResult = await tasks.providerAddDataset(provider.datasetFile)
    console.log(JSON.stringify(datasetResult))
    // @ts-ignore
    return datasetResult[0].args[1] as Hash
}

export async function setupDapp (env, dapp: TestDapp): Promise<void> {
    console.log('\n---------------\nSetup Dapp\n---------------')
    const tasks = new Tasks(env)
    await env.changeSigner(dapp.mnemonic)
    console.log(' - dappRegister')
    await tasks.dappRegister(hexHash(dapp.serviceOrigin), dapp.contractAccount, blake2AsHex(decodeAddress(dapp.optionalOwner)))
    console.log(' - dappFund')
    await tasks.dappFund(dapp.contractAccount, dapp.fundAmount)
}

export async function setupDappUser (env, dappUser: TestAccount, provider: TestProvider, dapp: TestDapp): Promise<string | undefined> {
    console.log('\n---------------\nSetup Dapp User\n---------------')
    await env.changeSigner(dappUser.mnemonic)

    // This section is doing everything that the ProCaptcha repo will eventually be doing in the client browser
    //   1. Get captcha JSON
    //   2. Add solution
    //   3. Send merkle tree solution to Blockchain
    //   4. Send clear solution to Provider
    const tasks = new Tasks(env)
    console.log(' - getCaptchaWithProof')
    const providerOnChain = await tasks.getProviderDetails(provider.address)
    if (providerOnChain) {
        const solved = await tasks.getCaptchaWithProof(providerOnChain.captchaDatasetId, true, 1)
        const unsolved = await tasks.getCaptchaWithProof(providerOnChain.captchaDatasetId, false, 1)
        solved[0].captcha.solution = [2, 3, 4]
        unsolved[0].captcha.solution = [1]
        solved[0].captcha.salt = '0xuser1'
        unsolved[0].captcha.salt = '0xuser2'
        // TODO add salt to solution https://github.com/prosopo-io/provider/issues/35
        console.log(' - build Merkle tree')
        const tree = new CaptchaMerkleTree()
        const captchas = [solved[0].captcha, unsolved[0].captcha]
        const captchaSols = captchas.map(captcha => convertCaptchaToCaptchaSolution(captcha))
        const captchaSolHashes = captchaSols.map(computeCaptchaSolutionHash)
        tree.build(captchaSolHashes)
        await env.changeSigner(dappUser.mnemonic)
        const captchaData = await tasks.getCaptchaData(providerOnChain.captchaDatasetId.toString())
        if (captchaData.merkle_tree_root !== providerOnChain.captchaDatasetId.toString()) {
            throw new Error(`Cannot find captcha data id: ${providerOnChain.captchaDatasetId.toString()}`)
        }
        const commitmentId = tree.root?.hash
        console.log(' - dappUserCommit')
        if (typeof (dapp.contractAccount) === 'string' && typeof (commitmentId) === 'string') {
            console.log(' -   Contract Account: ', dapp.contractAccount)
            console.log(' -   Captcha Dataset ID: ', providerOnChain.captchaDatasetId)
            console.log(' -   Solution Root Hash: ', commitmentId)
            console.log(' -   Provider Address: ', provider.address)
            console.log(' -   Captchas: ', captchas)
            await tasks.dappUserCommit(dapp.contractAccount, providerOnChain.captchaDatasetId, commitmentId, provider.address)
            const commitment = await tasks.getCaptchaSolutionCommitment(commitmentId)
            console.log('Commitment: ', commitment)
        } else {
            throw new Error('Either DAPP_CONTRACT_ACCOUNT not set or commitmentId not generated')
        }
        return commitmentId
    } else {
        throw new Error('Provider not found')
    }
}

export async function approveOrDisapproveCommitment (env, solutionHash: string, approve: boolean, provider: TestProvider) {
    console.log('\n---------------\nApprove or Disapprove Commitment\n---------------')
    const tasks = new Tasks(env)
    // This stage would take place on the Provider node after checking the solution was correct
    // We need to assume that the Provider has access to the Dapp User's merkle tree root or can construct it from the
    // raw data that was sent to them
    await env.changeSigner(provider.mnemonic)
    if (approve) {
        console.log(' -   Approving commitment')
        await tasks.providerApprove(solutionHash)
    } else {
        console.log(' -   Disapproving commitment')
        await tasks.providerDisapprove(solutionHash)
    }
}
