import { ProsopoNetwork, ProsopoServerConfig, ProviderApi } from '@prosopo/api'
import { ContractAbi, ProsopoContractMethods, abiJson } from '@prosopo/contract'
import { ProsopoEnvError } from '@prosopo/datasets'
import { WsProvider } from '@polkadot/rpc-provider'
import { Keyring } from '@polkadot/keyring'
import { KeyringPair } from '@polkadot/keyring/types'
import { ApiPromise } from '@polkadot/api'
import consola, { LogLevel } from 'consola'
import prosopoConfig from '../prosopo.config'

export class ProsopoServer {
    config: ProsopoServerConfig
    contractInterface: ProsopoContractMethods
    mnemonic: string
    contractAddress: string
    defaultEnvironment: string
    contractName: string
    abi: ContractAbi
    logger: typeof consola
    wsProvider: WsProvider
    keyring: Keyring
    pair: KeyringPair
    api: ApiPromise
    network: ProsopoNetwork

    constructor(mnemonic: string) {
        this.config = ProsopoServer.getConfig()
        this.mnemonic = mnemonic
        if (
            this.config.defaultEnvironment &&
            Object.prototype.hasOwnProperty.call(this.config.networks, this.config.defaultEnvironment)
        ) {
            this.defaultEnvironment = this.config.defaultEnvironment
            this.network = this.config.networks[this.defaultEnvironment]
            this.wsProvider = new WsProvider(this.config.networks[this.defaultEnvironment].endpoint)
            this.contractAddress = this.config.networks[this.defaultEnvironment].prosopoContract.address
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

    public async isVerified(userAccount: string, providerUrl?: string, commitmentId?: string): Promise<boolean> {
        if (providerUrl && commitmentId) {
            console.log('providerUrl', providerUrl)
            console.log('web3Account', userAccount)
            console.log('commitmentId', commitmentId)
            const providerApi = await this.getProviderApi(providerUrl)
            const result = await providerApi.verifyDappUser(userAccount, commitmentId)
            return result.solutionApproved
        } else {
            const contractApi = await this.getContractApi()
            return await contractApi.dappOperatorIsHumanUser(userAccount, this.config.solutionThreshold)
        }
    }

    public async getContractApi(): Promise<ProsopoContractMethods> {
        this.contractInterface = await ProsopoContractMethods.create(
            this.contractAddress,
            this.pair,
            this.contractName,
            this.abi,
            this.api
        )
        return this.contractInterface
    }

    private static getConfig(): ProsopoServerConfig {
        return prosopoConfig() as ProsopoServerConfig
    }
}
