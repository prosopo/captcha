// Copyright 2021-2023 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import { ApiPromise } from '@polkadot/api/promise/Api'
import { BlockHash } from '@polkadot/types/interfaces'
import {
    ContractAbi,
    NetworkConfig,
    NetworkNamesSchema,
    ProcaptchaOutput,
    ProsopoServerConfigOutput,
} from '@prosopo/types'
import { Keyring } from '@polkadot/keyring'
import { KeyringPair } from '@polkadot/keyring/types'
import { LogLevel, Logger, ProsopoEnvError, getLogger, trimProviderUrl } from '@prosopo/common'
import { ProsopoCaptchaContract, getZeroAddress } from '@prosopo/contract'
import { ProviderApi } from '@prosopo/api'
import { RandomProvider } from '@prosopo/captcha-contract/types-returns'
import { WsProvider } from '@polkadot/rpc-provider/ws'
import { ContractAbi as abiJson } from '@prosopo/captcha-contract/contract-info'
import { get } from '@prosopo/util'

export class ProsopoServer {
    config: ProsopoServerConfigOutput
    contract: ProsopoCaptchaContract | undefined
    prosopoContractAddress: string
    dappContractAddress: string | undefined
    defaultEnvironment: string
    contractName: string
    abi: ContractAbi
    logger: Logger
    wsProvider: WsProvider
    keyring: Keyring
    pair: KeyringPair | undefined
    api: ApiPromise | undefined
    network: NetworkConfig

    constructor(config: ProsopoServerConfigOutput, pair?: KeyringPair) {
        this.config = config
        this.pair = pair
        this.defaultEnvironment = this.config.defaultEnvironment
        const networkName = NetworkNamesSchema.parse(this.config.defaultNetwork)
        this.network = get(this.config.networks, networkName)
        this.wsProvider = new WsProvider(this.network.endpoint)
        this.prosopoContractAddress = this.network.contract.address
        this.dappContractAddress = this.config.account.address
        this.contractName = this.network.contract.name
        this.logger = getLogger(this.config.logLevel as unknown as LogLevel, '@prosopo/server')
        this.keyring = new Keyring({
            type: 'sr25519', // TODO get this from the chain
        })
        this.abi = JSON.parse(abiJson)
    }

    public async getProviderApi(providerUrl: string) {
        return new ProviderApi(this.network, providerUrl, this.getDappContractAddress())
    }

    public getDappContractAddress(): string {
        if (!this.dappContractAddress) {
            return getZeroAddress(this.getApi()).toString()
        }
        return this.dappContractAddress
    }

    async isReady() {
        try {
            this.api = await ApiPromise.create({ provider: this.wsProvider, initWasm: false })
            await this.getSigner()
            await this.getContractApi()
        } catch (err) {
            throw new ProsopoEnvError(err as Error, 'GENERAL.ENVIRONMENT_NOT_READY')
        }
    }

    async getSigner(): Promise<void> {
        if (this.pair) {
            if (!this.api) {
                this.api = await ApiPromise.create({ provider: this.wsProvider, initWasm: false })
            }
            await this.api.isReadyOrError
            try {
                this.pair = this.keyring.addPair(this.pair)
            } catch (err) {
                throw new ProsopoEnvError('CONTRACT.SIGNER_UNDEFINED', this.getSigner.name, {}, err)
            }
        }
    }

    getApi(): ApiPromise {
        if (this.api === undefined) {
            throw new ProsopoEnvError(new Error('api undefined'))
        }
        return this.api
    }

    getContract(): ProsopoCaptchaContract {
        if (this.contract === undefined) {
            throw new ProsopoEnvError(new Error('contract undefined'))
        }
        return this.contract
    }

    /**
     *
     * @param payload Info output by procaptcha on completion of the captcha process
     * @param maxVerifiedTime Maximum time in milliseconds since the blockNumber
     * @returns
     */
    public async isVerified(payload: ProcaptchaOutput, maxVerifiedTime?: number): Promise<boolean> {
        const { user, dapp, providerUrl, commitmentId, blockNumber } = payload

        // Check if the provider was actually chosen at blockNumber
        const contractApi = await this.getContractApi()
        const block = (await this.getApi().rpc.chain.getBlockHash(blockNumber)) as BlockHash
        const getRandomProviderResponse = await this.getContract().queryAtBlock<RandomProvider>(
            block,
            'getRandomActiveProvider',
            [user, dapp]
        )
        const providerUrlTrimmed = trimProviderUrl(getRandomProviderResponse.provider.url.toString())
        if (providerUrlTrimmed !== providerUrl) {
            return false
        }
        console.log('providerUrlTrimmed', providerUrlTrimmed, 'commitmentId', commitmentId)
        if (providerUrlTrimmed) {
            const providerApi = await this.getProviderApi(providerUrl)
            const result = await providerApi.verifyDappUser(dapp, user, commitmentId, maxVerifiedTime)
            return result.solutionApproved
        } else {
            // Check the time since the last correct captcha is less than the maxVerifiedTime
            const blockTime = contractApi.api.consts.babe.expectedBlockTime.toNumber()
            const blocksSinceLastCorrectCaptcha = (await contractApi.query.dappOperatorLastCorrectCaptcha(user)).value
                .unwrap()
                .unwrap()
                .before.valueOf()
            if (maxVerifiedTime && blockTime * blocksSinceLastCorrectCaptcha > maxVerifiedTime) {
                return false
            }

            return (await contractApi.query.dappOperatorIsHumanUser(user, this.config.solutionThreshold)).value
                .unwrap()
                .unwrap()
        }
    }

    public async getContractApi(): Promise<ProsopoCaptchaContract> {
        this.contract = new ProsopoCaptchaContract(
            this.getApi(),
            this.abi,
            this.prosopoContractAddress,
            this.contractName,
            0,
            this.pair
        )
        return this.contract
    }
}
