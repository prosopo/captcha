import { ProsopoNetwork, ProsopoServerConfig, ProviderApi } from '@prosopo/api'
import { ContractAbi, ProsopoContractMethods, abiJson } from '@prosopo/contract'
import { ProsopoEnvError } from '@prosopo/common'
import { WsProvider } from '@polkadot/rpc-provider'
import { Keyring } from '@polkadot/keyring'
import { KeyringPair } from '@polkadot/keyring/types'
import { ApiPromise } from '@polkadot/api'
import consola, { LogLevel } from 'consola'
import { trimProviderUrl } from '@prosopo/procaptcha'

export class ProsopoServer {
    config: ProsopoServerConfig
    contractInterface: ProsopoContractMethods
    mnemonic: string
    prosopoContractAddress: string
    dappContractAddress: string
    defaultEnvironment: string
    contractName: string
    abi: ContractAbi
    logger: typeof consola
    wsProvider: WsProvider
    keyring: Keyring
    pair: KeyringPair
    api: ApiPromise
    network: ProsopoNetwork

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
            this.prosopoContractAddress = this.config.networks[this.defaultEnvironment].prosopoContract.address
            this.dappContractAddress = this.config.networks[this.defaultEnvironment].dappContract.address
            this.contractName = this.config.networks[this.defaultEnvironment].prosopoContract.name
            this.logger = consola.create({
                level: this.config.logLevel as unknown as LogLevel,
            })
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
        return new ProviderApi(this.network, providerUrl)
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

    public async isVerified(
        userAccount: string,
        providerUrl?: string,
        commitmentId?: string,
        blockNumber?: string
    ): Promise<boolean> {
        // first check if the provider was actually chosen at blockNumber
        const contractApi = await this.getContractApi()
        const getRandomProviderResponse = await contractApi.getRandomProvider(
            userAccount,
            this.dappContractAddress,
            blockNumber
        )
        const serviceOrigin = trimProviderUrl(getRandomProviderResponse.provider.serviceOrigin.toString())
        if (serviceOrigin !== providerUrl) {
            return false
        }

        if (providerUrl && commitmentId) {
            console.log('providerUrl', providerUrl)
            console.log('web3Account', userAccount)
            console.log('commitmentId', commitmentId)
            const providerApi = await this.getProviderApi(providerUrl)
            const result = await providerApi.verifyDappUser(userAccount, commitmentId)
            return result.solutionApproved
        } else {
            return await contractApi.getDappOperatorIsHumanUser(userAccount, this.config.solutionThreshold)
        }
    }

    public async getContractApi(): Promise<ProsopoContractMethods> {
        this.contractInterface = new ProsopoContractMethods(
            this.api,
            this.abi,
            this.prosopoContractAddress,
            this.pair,
            this.contractName,
            0
        )
        return this.contractInterface
    }
}
