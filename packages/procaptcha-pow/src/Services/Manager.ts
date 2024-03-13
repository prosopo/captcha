import { ApiPromise } from '@polkadot/api/promise/Api'
import { Keyring } from '@polkadot/keyring'
import { WsProvider } from '@polkadot/rpc-provider/ws'
import { ExtensionWeb2 } from '@prosopo/account'
import { ProviderApi } from '@prosopo/api'
import { ContractAbi as abiJson } from '@prosopo/captcha-contract/contract-info'
import type { RandomProvider } from '@prosopo/captcha-contract/types-returns'
import { ProsopoEnvError, trimProviderUrl } from '@prosopo/common'
import { ProsopoCaptchaContract, wrapQuery } from '@prosopo/contract'
import {
    type ProcaptchaClientConfigInput,
    type ProcaptchaClientConfigOutput,
    ProcaptchaConfigSchema,
} from '@prosopo/types'
import { solvePoW } from './SolverService.js'

type ProcaptchaPowOutput = {
    user: string
    dapp: string
    commitmentId?: string | undefined
    providerUrl?: string | undefined
    blockNumber?: number | undefined
}

export interface ProcaptchaEvents {
    onError: (error: Error) => void
    onHuman: (output: ProcaptchaPowOutput) => void
    onExtensionNotFound: () => void
    onChallengeExpired: () => void
    onExpired: () => void
    onFailed: () => void
    onOpen: () => void
    onClose: () => void
}

export const Manager = async (configInput: ProcaptchaClientConfigInput) => {
    const getConfig = () => {
        const config: ProcaptchaClientConfigInput = {
            userAccountAddress: '',
            ...configInput,
        }

        return ProcaptchaConfigSchema.parse(config)
    }

    const getNetwork = (config: ProcaptchaClientConfigOutput) => {
        const network = config.networks[config.defaultNetwork]
        if (!network) {
            throw new ProsopoEnvError('DEVELOPER.NETWORK_NOT_FOUND', {
                context: {
                    error: `No network found for environment ${config.defaultEnvironment}`,
                },
            })
        }
        return network
    }
    /**
     * Load the contract instance using addresses from config.
     */
    const loadContract = async (): Promise<ProsopoCaptchaContract> => {
        const network = getNetwork(getConfig())
        const api = await ApiPromise.create({
            provider: new WsProvider(network.endpoint),
            initWasm: false,
        })
        const type = 'sr25519'
        const keyring = new Keyring({
            type,
            ss58Format: api.registry.chainSS58,
        })

        return new ProsopoCaptchaContract(
            api,
            JSON.parse(abiJson),
            network.contract.address,
            'prosopo',
            0,
            keyring.addFromAddress(getConfig().account.address || '')
        )
    }

    const config = getConfig()
    // check if account has been provided in config (doesn't matter in web2 mode)
    if (!config.web2 && !config.userAccountAddress) {
        throw new ProsopoEnvError('GENERAL.ACCOUNT_NOT_FOUND', {
            context: {
                error: 'Account address has not been set for web3 mode',
            },
        })
    }

    // check if account exists in extension
    const ext = new ExtensionWeb2()
    const account = await ext.getAccount(config)

    const contract = await loadContract()
    // get a random provider
    const getRandomProviderResponse: RandomProvider = await wrapQuery(
        contract.query.getRandomActiveProvider,
        contract.query
    )(account.account.address, configInput.account.address || '')

    const providerUrl = trimProviderUrl(getRandomProviderResponse.provider.url.toString())

    const providerApi = new ProviderApi(getNetwork(getConfig()), providerUrl, configInput.account.address || '')

    const challenge = await providerApi.getPowCaptchaChallenge(
        account.account.address,
        configInput.account.address || ''
    )

    console.log('challenge', challenge)

    console.log('challenge', challenge.challenge)
    console.log('challenge', challenge.difficulty)

    const solution = solvePoW(challenge.challenge, challenge.difficulty)

    console.log('solution', solution)

    const verifiedSolution = await providerApi.submitPowCaptchaSolution(
        challenge,
        account.account.address,
        configInput.account.address || '',
        getRandomProviderResponse,
        solution
    )
    return verifiedSolution
}
