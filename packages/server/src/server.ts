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
import {
    LogLevel,
    Logger,
    ProsopoApiError,
    ProsopoContractError,
    ProsopoEnvError,
    getLogger,
    trimProviderUrl,
} from '@prosopo/common'
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
            throw new ProsopoContractError('CAPTCHA.INVALID_BLOCK_NO', { context: { error: 'Block number not found' } })
        }
        const signatureHex = u8aToHex(dappUserSignature)

        const providerApi = await this.getProviderApi(providerUrl)
        if (challenge) {
            const result = await providerApi.submitPowCaptchaVerify(token, signatureHex, timeouts.pow.cachedTimeout)
            // We don't care about recency with PoW challenges as they are single use, so just return the verified result
            return result.verified
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

        const { providerUrl, blockNumber, challenge } = ProcaptchaOutputSchema.parse(payload)

        if (providerUrl) {
            return await this.verifyProvider(token, blockNumber, this.config.timeouts, providerUrl, challenge)
        } else {
            // If we don't have a providerURL, something has gone deeply wrong
            throw new ProsopoApiError('API.BAD_REQUEST', { context: { message: 'No provider URL' } })
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
