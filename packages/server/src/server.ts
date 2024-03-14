// Copyright 2021-2024 Prosopo (UK) Ltd.
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
import { BN } from '@polkadot/util'
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
import { ProsopoCaptchaContract, getExpectedBlockTime, getZeroAddress } from '@prosopo/contract'
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
        } catch (error) {
            throw new ProsopoEnvError('GENERAL.ENVIRONMENT_NOT_READY', { context: { error } })
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
            } catch (error) {
                throw new ProsopoEnvError('CONTRACT.SIGNER_UNDEFINED', {
                    context: { failedFuncName: this.getSigner.name, error },
                })
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

    async getViableHistoricBlockCount(maxVerifiedTime?: number): Promise<number> {
        const expectedBlockTime = getExpectedBlockTime(this.getApi())
        return new BN(maxVerifiedTime || 60000).div(expectedBlockTime).toNumber()
    }

    /**
     * Check if the provider was actually chosen at blockNumber.
     * - If no blockNumber is provided, check the last `n` blocks where `n` is the number of blocks that fit in
     *   `maxVerifiedTime`.
     * - If no `maxVerifiedTime` is provided, use the default of 1 minute.
     * @param user
     * @param dapp
     * @param providerUrl
     * @param blockNumber
     * @param maxVerifiedTime
     * @returns
     */
    async checkRandomProvider(
        user: string,
        dapp: string,
        providerUrl?: string,
        blockNumber?: number,
        maxVerifiedTime?: number
    ) {
        // Check if the provider was actually chosen at blockNumber
        let blocksToCheck: number[] = []
        if (blockNumber) {
            blocksToCheck = [blockNumber]
        } else {
            const numberOfHistoricBlocksToCheck = await this.getViableHistoricBlockCount(maxVerifiedTime)
            const currentBlockNumber = (await this.getApi().rpc.chain.getBlock()).block.header.number.toNumber()
            blocksToCheck = Array.from(
                { length: numberOfHistoricBlocksToCheck },
                (_, index) => currentBlockNumber - index
            )
        }

        while (blocksToCheck.length > 0) {
            const block = await this.getApi().rpc.chain.getBlockHash(blocksToCheck.pop() as number)
            const getRandomProviderResponse = await this.getContract().queryAtBlock<RandomProvider>(
                block,
                'getRandomActiveProvider',
                [user, dapp]
            )
            if (trimProviderUrl(getRandomProviderResponse.provider.url.toString()) === providerUrl) {
                return getRandomProviderResponse.provider
            }
        }
        return undefined
    }

    /**
     *
     * @param payload Info output by procaptcha on completion of the captcha process
     * @param maxVerifiedTime Maximum time in milliseconds since the blockNumber
     * @returns
     */
    public async isVerified(payload: ProcaptchaOutput, maxVerifiedTime?: number): Promise<boolean> {
        const { user, dapp, providerUrl, commitmentId, blockNumber } = payload
        const contractApi = await this.getContractApi()

        const randomProvider = await this.checkRandomProvider(user, dapp, providerUrl, blockNumber, maxVerifiedTime)

        if (!randomProvider) {
            this.logger.info('Random provider selection failed')
            // We have not been able to repeat the provider selection
            return false
        }

        if (providerUrl) {
            this.logger.info('Random provider is valid. Verifying with provider.')
            // We can now trust the provider URL as it has been shown to have been randomly selected
            const providerApi = await this.getProviderApi(providerUrl)
            const result = await providerApi.verifyDappUser(dapp, user, commitmentId, maxVerifiedTime)
            return result.solutionApproved
        } else {
            this.logger.info('Provider URL not provided. Verifying with contract.')
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
