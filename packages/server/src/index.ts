import { ApiPromise } from '@polkadot/api'
import { BlockHash } from '@polkadot/types/interfaces/chain/index'
import { ContractAbi, NetworkConfig, ProsopoServerConfig, RandomProvider } from '@prosopo/types'
import { Keyring } from '@polkadot/keyring'
import { KeyringPair } from '@polkadot/keyring/types'
import { LogLevel, Logger, logger } from '@prosopo/common'
import { ProcaptchaOutput } from '@prosopo/types'
import { ProsopoCaptchaContract, abiJson } from '@prosopo/contract'
import { ProsopoEnvError, trimProviderUrl } from '@prosopo/common'
import { ProviderApi } from '@prosopo/api'
import { WsProvider } from '@polkadot/rpc-provider'

export class ProsopoServer {
    config: ProsopoServerConfig
    contract: ProsopoCaptchaContract
    mnemonic: string
    prosopoContractAddress: string
    dappContractAddress: string
    defaultEnvironment: string
    contractName: string
    abi: ContractAbi
    logger: Logger
    wsProvider: WsProvider
    keyring: Keyring
    pair: KeyringPair
    api: ApiPromise
    network: NetworkConfig

    constructor(mnemonic: string, config: ProsopoServerConfig) {
        this.config = config
        this.mnemonic = mnemonic
        if (
            this.config.defaultEnvironment &&
            Object.prototype.hasOwnProperty.call(this.config.networks, this.config.defaultEnvironment)
        ) {
            this.defaultEnvironment = this.config.defaultEnvironment
            this.network = this.config.networks[this.defaultEnvironment]
            this.wsProvider = new WsProvider(this.config.networks[this.defaultEnvironment].endpoint)
            this.prosopoContractAddress = this.config.networks[this.defaultEnvironment].contract.address
            this.dappContractAddress = this.config.account.address
            this.contractName = this.config.networks[this.defaultEnvironment].contract.name
            this.logger = logger(this.config.logLevel as unknown as LogLevel, '@prosopo/server')
            this.keyring = new Keyring({
                type: 'sr25519', // TODO get this from the chain
            })
            this.abi = abiJson as ContractAbi
        } else {
            throw new ProsopoEnvError(
                'CONFIG.UNKNOWN_ENVIRONMENT',
                this.constructor.name,
                {},
                this.config.defaultEnvironment
            )
        }
    }

    public async getProviderApi(providerUrl: string) {
        return new ProviderApi(this.network, providerUrl, this.config.account.address)
    }

    async isReady() {
        try {
            this.api = await ApiPromise.create({ provider: this.wsProvider })
            await this.getSigner()
            await this.getContractApi()
        } catch (err) {
            throw new ProsopoEnvError(err, 'GENERAL.ENVIRONMENT_NOT_READY')
        }
    }

    async getSigner(): Promise<void> {
        this.api = await ApiPromise.create({ provider: this.wsProvider })
        await this.api.isReadyOrError
        const { mnemonic } = this
        if (!mnemonic) {
            throw new ProsopoEnvError('CONTRACT.SIGNER_UNDEFINED')
        }
        this.pair = this.keyring.addFromMnemonic(mnemonic)
    }

    public async isVerified(payload: ProcaptchaOutput): Promise<boolean> {
        const { user, dapp, providerUrl, commitmentId, blockNumber } = payload
        // first check if the provider was actually chosen at blockNumber
        const contractApi = await this.getContractApi()
        const block = (await this.api.rpc.chain.getBlockHash(blockNumber)) as BlockHash
        const getRandomProviderResponse = await this.contract.queryAtBlock<RandomProvider>(
            block,
            'getRandomActiveProvider',
            [user, dapp]
        )
        const providerUrlTrimmed = trimProviderUrl(getRandomProviderResponse.provider.url.toString())
        if (providerUrlTrimmed !== providerUrl) {
            return false
        }
        console.log('providerUrlTrimmed', providerUrlTrimmed, 'commitmentId', commitmentId)
        if (providerUrlTrimmed && commitmentId) {
            const providerApi = await this.getProviderApi(providerUrl)
            const result = await providerApi.verifyDappUser(user, commitmentId)
            console.log(result)
            return result.solutionApproved
        } else {
            return (await contractApi.query.dappOperatorIsHumanUser(user, this.config.solutionThreshold)).value
                .unwrap()
                .unwrap()
        }
    }

    public async getContractApi(): Promise<ProsopoCaptchaContract> {
        this.contract = new ProsopoCaptchaContract(
            this.api,
            this.abi,
            this.prosopoContractAddress,
            this.pair,
            this.contractName,
            0
        )
        return this.contract
    }
}
