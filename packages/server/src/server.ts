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
import {
    CaptchaTimeoutOutput,
    ContractAbi,
    NetworkConfig,
    NetworkNamesSchema,
    ProcaptchaOutputSchema,
    ProcaptchaToken,
    ProsopoServerConfigOutput,
} from '@prosopo/types'
import { Keyring } from '@polkadot/keyring'
import { KeyringPair } from '@polkadot/keyring/types'
import { LogLevel, Logger, ProsopoContractError, ProsopoEnvError, getLogger, trimProviderUrl } from '@prosopo/common'
import { ProsopoCaptchaContract, getZeroAddress, verifyRecency } from '@prosopo/contract'
import { ProviderApi } from '@prosopo/api'
import { RandomProvider } from '@prosopo/captcha-contract/types-returns'
import { WsProvider } from '@polkadot/rpc-provider/ws'
import { ContractAbi as abiJson } from '@prosopo/captcha-contract/contract-info'
import { decodeProcaptchaOutput } from '@prosopo/types'
import { get } from '@prosopo/util'
import { isHex, u8aToHex } from '@polkadot/util'

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
            this.api = await ApiPromise.create({ provider: this.wsProvider, initWasm: false, noInitWarn: true })
            await this.getSigner()
            await this.getContractApi()
        } catch (error) {
            throw new ProsopoEnvError('GENERAL.ENVIRONMENT_NOT_READY', { context: { error } })
        }
    }

    async getSigner(): Promise<void> {
        if (this.pair) {
            if (!this.api) {
                this.api = await ApiPromise.create({ provider: this.wsProvider, initWasm: false, noInitWarn: true })
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

    /**
     * Check if the provider was actually chosen at blockNumber.
     * - If no blockNumber is provided, check the last `n` blocks where `n` is the number of blocks that fit in
     *   `maxVerifiedTime`.
     * - If no `maxVerifiedTime` is provided, use the default of 1 minute.
     * @param user
     * @param dapp
     * @param providerUrl
     * @param blockNumber
     * @returns
     */
    async checkRandomProvider(user: string, dapp: string, providerUrl: string, blockNumber: number) {
        const block = await this.getApi().rpc.chain.getBlockHash(blockNumber)
        // Check if the provider was actually chosen at blockNumber
        const getRandomProviderResponse = await this.getContract().queryAtBlock<RandomProvider>(
            block,
            'getRandomActiveProvider',
            [user, dapp]
        )
        if (trimProviderUrl(getRandomProviderResponse.provider.url.toString()) === providerUrl) {
            return getRandomProviderResponse.provider
        }

        return undefined
    }

    /**
     * Verify the user with the contract. We check the contract to see if the user has completed a captcha in the
     * past. If they have, we check the time since the last correct captcha is within the maxVerifiedTime and we check
     * whether the user is marked as human within the contract.
     * @param user
     * @param maxVerifiedTime
     */
    public async verifyContract(user: string, maxVerifiedTime: number) {
        try {
            const contractApi = await this.getContractApi()
            this.logger.info('Provider URL not provided. Verifying with contract.')
            const correctCaptchaBlockNumber = (await contractApi.query.dappOperatorLastCorrectCaptcha(user)).value
                .unwrap()
                .unwrap()
                .before.valueOf()
            const recent = await verifyRecency(
                (await this.getContractApi()).api,
                correctCaptchaBlockNumber,
                maxVerifiedTime
            )
            if (!recent) {
                this.logger.info('User has not completed a captcha recently')
                return false
            }
            const isHuman = (await contractApi.query.dappOperatorIsHumanUser(user, this.config.solutionThreshold)).value
                .unwrap()
                .unwrap()
            this.logger.info('isHuman', isHuman)
            return isHuman
        } catch (error) {
            this.logger.error(error)
            // if a user is not in the contract it errors, suppress this error and return false
            return false
        }
    }

    /**
     * Verify the user with the provider URL passed in. If a challenge is provided, we use the challenge to verify the
     * user. If not, we use the user, dapp, and optionally the commitmentID, to verify the user.
     * @param token
     * @param blockNumber
     * @param timeouts
     * @param providerUrl
     * @param challenge
     */
    public async verifyProvider(
        token: string,
        blockNumber: number,
        timeouts: CaptchaTimeoutOutput,
        providerUrl: string,
        challenge?: string
    ) {
        this.logger.info('Verifying with provider.')
        const blockNumberString = blockNumber.toString()
        const dappUserSignature = this.pair?.sign(blockNumberString)
        if (!dappUserSignature) {
            throw new ProsopoContractError('GENERAL.INVALID_SIGNATURE', { context: { blockNumber } })
        }
        const signatureHex = u8aToHex(dappUserSignature)

        const providerApi = await this.getProviderApi(providerUrl)
        if (challenge) {
            const result = await providerApi.submitPowCaptchaVerify(token, signatureHex, timeouts.pow.cachedTimeout)
            // We don't care about recency with PoW challenges as they are single use, so just return the verified result
            return result.verified
        }
        const recent = await verifyRecency((await this.getContractApi()).api, blockNumber, timeouts.image.cachedTimeout)

        if (!recent) {
            // bail early if the block is too old. This saves us calling the Provider.
            return false
        }
        const result = await providerApi.verifyDappUser(token, signatureHex, timeouts.image.cachedTimeout)

        return result.verified
    }

    /**
     *
     * @returns
     * @param token
     */
    public async isVerified(token: ProcaptchaToken): Promise<boolean> {
        if (!isHex(token)) {
            this.logger.error('Invalid token - not hex', token)
            return false
        }

        const payload = decodeProcaptchaOutput(token)

        const { user, providerUrl, blockNumber, challenge } = ProcaptchaOutputSchema.parse(payload)

        if (providerUrl && blockNumber) {
            // By requiring block number, we load balance requests to the providers by requiring that the random
            // provider selection should be repeatable. If we have a block number, we check the provider was selected
            // at that block.

            // const randomProvider = await this.checkRandomProvider(user, dapp, providerUrl, blockNumber)
            // if (!randomProvider) {
            //     this.logger.info('Random provider selection failed')
            //     // We have not been able to repeat the provider selection
            //     return false
            // }

            // If we have a providerURL and a blockNumber, we verify with the provider

            return await this.verifyProvider(token, blockNumber, this.config.timeouts, providerUrl, challenge)
        } else {
            // If we don't have a providerURL, we verify with the contract
            return await this.verifyContract(user, this.config.timeouts.contract.maxVerifiedTime)
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
