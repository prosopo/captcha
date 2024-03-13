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
/* This file is auto-generated */

import { handleReturnType, queryOkJSON } from '@prosopo/typechain-types'
import { txSignAndSend } from '@prosopo/typechain-types'
import type * as ArgumentTypes from '../types-arguments/captcha.js'
import type * as ReturnTypes from '../types-returns/captcha.js'
import type { ApiPromise } from '@polkadot/api'
import type { ContractPromise } from '@polkadot/api-contract'
import type { GasLimit, GasLimitAndRequiredValue, Result } from '@prosopo/typechain-types'
import type { KeyringPair } from '@polkadot/keyring/types'
import type { QueryReturnType } from '@prosopo/typechain-types'
import type BN from 'bn.js'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { ReturnNumber } from '@prosopo/typechain-types'
import { getTypeDescription } from './../shared/utils.js'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { decodeEvents } from '../shared/utils.js'
import DATA_TYPE_DESCRIPTIONS from '../data/captcha.json' assert { type: 'json' }
import EVENT_DATA_TYPE_DESCRIPTIONS from '../event-data/captcha.json' assert { type: 'json' }
import type { EventRecord } from '@polkadot/types/interfaces'

export default class Methods {
    readonly __nativeContract: ContractPromise
    readonly __keyringPair: KeyringPair
    readonly __callerAddress: string
    readonly __apiPromise: ApiPromise

    constructor(apiPromise: ApiPromise, nativeContract: ContractPromise, keyringPair: KeyringPair) {
        this.__apiPromise = apiPromise
        this.__nativeContract = nativeContract
        this.__keyringPair = keyringPair
        this.__callerAddress = keyringPair.address
    }

    /**
     * getGitCommitId
     *
     * @returns { Result<Array<number>, ReturnTypes.LangError> }
     */
    getGitCommitId(__options: GasLimit): Promise<QueryReturnType<Result<Array<number>, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'getGitCommitId',
            [],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(16, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * getAdmin
     *
     * @returns { Result<ReturnTypes.AccountId, ReturnTypes.LangError> }
     */
    getAdmin(__options: GasLimit): Promise<QueryReturnType<Result<ReturnTypes.AccountId, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'getAdmin',
            [],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(18, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * getPayees
     *
     * @returns { Result<Array<ReturnTypes.Payee>, ReturnTypes.LangError> }
     */
    getPayees(__options: GasLimit): Promise<QueryReturnType<Result<Array<ReturnTypes.Payee>, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'getPayees',
            [],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(19, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * getDappPayees
     *
     * @returns { Result<Array<ReturnTypes.DappPayee>, ReturnTypes.LangError> }
     */
    getDappPayees(
        __options: GasLimit
    ): Promise<QueryReturnType<Result<Array<ReturnTypes.DappPayee>, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'getDappPayees',
            [],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(22, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * getStatuses
     *
     * @returns { Result<Array<ReturnTypes.GovernanceStatus>, ReturnTypes.LangError> }
     */
    getStatuses(
        __options: GasLimit
    ): Promise<QueryReturnType<Result<Array<ReturnTypes.GovernanceStatus>, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'getStatuses',
            [],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(25, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * getProviderStakeThreshold
     *
     * @returns { Result<ReturnNumber, ReturnTypes.LangError> }
     */
    getProviderStakeThreshold(
        __options: GasLimit
    ): Promise<QueryReturnType<Result<ReturnNumber, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'getProviderStakeThreshold',
            [],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(28, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * getDappStakeThreshold
     *
     * @returns { Result<ReturnNumber, ReturnTypes.LangError> }
     */
    getDappStakeThreshold(__options: GasLimit): Promise<QueryReturnType<Result<ReturnNumber, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'getDappStakeThreshold',
            [],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(28, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * getMaxProviderFee
     *
     * @returns { Result<number, ReturnTypes.LangError> }
     */
    getMaxProviderFee(__options: GasLimit): Promise<QueryReturnType<Result<number, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'getMaxProviderFee',
            [],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(29, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * getMinNumActiveProviders
     *
     * @returns { Result<number, ReturnTypes.LangError> }
     */
    getMinNumActiveProviders(__options: GasLimit): Promise<QueryReturnType<Result<number, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'getMinNumActiveProviders',
            [],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(30, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * getBlockTime
     *
     * @returns { Result<number, ReturnTypes.LangError> }
     */
    getBlockTime(__options: GasLimit): Promise<QueryReturnType<Result<number, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'getBlockTime',
            [],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(30, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * getMaxUserHistoryAgeSeconds
     *
     * @returns { Result<number, ReturnTypes.LangError> }
     */
    getMaxUserHistoryAgeSeconds(__options: GasLimit): Promise<QueryReturnType<Result<number, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'getMaxUserHistoryAgeSeconds',
            [],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(29, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * getMaxUserHistoryLen
     *
     * @returns { Result<number, ReturnTypes.LangError> }
     */
    getMaxUserHistoryLen(__options: GasLimit): Promise<QueryReturnType<Result<number, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'getMaxUserHistoryLen',
            [],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(30, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * getMaxUserHistoryAgeBlocks
     *
     * @returns { Result<number, ReturnTypes.LangError> }
     */
    getMaxUserHistoryAgeBlocks(__options: GasLimit): Promise<QueryReturnType<Result<number, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'getMaxUserHistoryAgeBlocks',
            [],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(29, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * providerRegister
     *
     * @param { Array<(number | string | BN)> } url,
     * @param { (number | string | BN) } fee,
     * @param { ArgumentTypes.Payee } payee,
     * @returns { void }
     */
    providerRegister(
        url: Array<number | string | BN>,
        fee: number | string | BN,
        payee: ArgumentTypes.Payee,
        __options: GasLimitAndRequiredValue
    ) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'providerRegister',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [url, fee, payee],
            __options
        )
    }

    /**
     * providerUpdate
     *
     * @param { Array<(number | string | BN)> } url,
     * @param { (number | string | BN) } fee,
     * @param { ArgumentTypes.Payee } payee,
     * @returns { void }
     */
    providerUpdate(
        url: Array<number | string | BN>,
        fee: number | string | BN,
        payee: ArgumentTypes.Payee,
        __options: GasLimitAndRequiredValue
    ) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'providerUpdate',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [url, fee, payee],
            __options
        )
    }

    /**
     * providerDeactivate
     *
     * @returns { void }
     */
    providerDeactivate(__options: GasLimit) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'providerDeactivate',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [],
            __options
        )
    }

    /**
     * providerDeregister
     *
     * @returns { void }
     */
    providerDeregister(__options: GasLimit) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'providerDeregister',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [],
            __options
        )
    }

    /**
     * getProvider
     *
     * @param { ArgumentTypes.AccountId } account,
     * @returns { Result<Result<ReturnTypes.Provider, ReturnTypes.Error>, ReturnTypes.LangError> }
     */
    getProvider(
        account: ArgumentTypes.AccountId,
        __options: GasLimit
    ): Promise<QueryReturnType<Result<Result<ReturnTypes.Provider, ReturnTypes.Error>, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'getProvider',
            [account],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(32, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * providerFund
     *
     * @returns { void }
     */
    providerFund(__options: GasLimitAndRequiredValue) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'providerFund',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [],
            __options
        )
    }

    /**
     * providerSetDataset
     *
     * @param { ArgumentTypes.Hash } datasetId,
     * @param { ArgumentTypes.Hash } datasetIdContent,
     * @returns { void }
     */
    providerSetDataset(
        datasetId: ArgumentTypes.Hash,
        datasetIdContent: ArgumentTypes.Hash,
        __options: GasLimitAndRequiredValue
    ) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'providerSetDataset',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [datasetId, datasetIdContent],
            __options
        )
    }

    /**
     * getDapp
     *
     * @param { ArgumentTypes.AccountId } contract,
     * @returns { Result<Result<ReturnTypes.Dapp, ReturnTypes.Error>, ReturnTypes.LangError> }
     */
    getDapp(
        contract: ArgumentTypes.AccountId,
        __options: GasLimit
    ): Promise<QueryReturnType<Result<Result<ReturnTypes.Dapp, ReturnTypes.Error>, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'getDapp',
            [contract],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(35, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * dappRegister
     *
     * @param { ArgumentTypes.AccountId } contract,
     * @param { ArgumentTypes.DappPayee } payee,
     * @returns { void }
     */
    dappRegister(
        contract: ArgumentTypes.AccountId,
        payee: ArgumentTypes.DappPayee,
        __options: GasLimitAndRequiredValue
    ) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'dappRegister',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [contract, payee],
            __options
        )
    }

    /**
     * dappUpdate
     *
     * @param { ArgumentTypes.AccountId } contract,
     * @param { ArgumentTypes.DappPayee } payee,
     * @param { ArgumentTypes.AccountId } owner,
     * @returns { void }
     */
    dappUpdate(
        contract: ArgumentTypes.AccountId,
        payee: ArgumentTypes.DappPayee,
        owner: ArgumentTypes.AccountId,
        __options: GasLimitAndRequiredValue
    ) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'dappUpdate',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [contract, payee, owner],
            __options
        )
    }

    /**
     * dappFund
     *
     * @param { ArgumentTypes.AccountId } contract,
     * @returns { void }
     */
    dappFund(contract: ArgumentTypes.AccountId, __options: GasLimitAndRequiredValue) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'dappFund',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [contract],
            __options
        )
    }

    /**
     * dappDeregister
     *
     * @param { ArgumentTypes.AccountId } contract,
     * @returns { void }
     */
    dappDeregister(contract: ArgumentTypes.AccountId, __options: GasLimit) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'dappDeregister',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [contract],
            __options
        )
    }

    /**
     * dappDeactivate
     *
     * @param { ArgumentTypes.AccountId } contract,
     * @returns { void }
     */
    dappDeactivate(contract: ArgumentTypes.AccountId, __options: GasLimit) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'dappDeactivate',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [contract],
            __options
        )
    }

    /**
     * getUserHistorySummary
     *
     * @param { ArgumentTypes.AccountId } userAccount,
     * @returns { Result<Result<ReturnTypes.UserHistorySummary, ReturnTypes.Error>, ReturnTypes.LangError> }
     */
    getUserHistorySummary(
        userAccount: ArgumentTypes.AccountId,
        __options: GasLimit
    ): Promise<
        QueryReturnType<Result<Result<ReturnTypes.UserHistorySummary, ReturnTypes.Error>, ReturnTypes.LangError>>
    > {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'getUserHistorySummary',
            [userAccount],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(38, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * providerCommit
     *
     * @param { ArgumentTypes.Commit } commit,
     * @returns { void }
     */
    providerCommit(commit: ArgumentTypes.Commit, __options: GasLimit) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'providerCommit',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [commit],
            __options
        )
    }

    /**
     * providerCommitMany
     *
     * @param { Array<ArgumentTypes.Commit> } commits,
     * @returns { void }
     */
    providerCommitMany(commits: Array<ArgumentTypes.Commit>, __options: GasLimit) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'providerCommitMany',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [commits],
            __options
        )
    }

    /**
     * dappOperatorIsHumanUser
     *
     * @param { ArgumentTypes.AccountId } userAccount,
     * @param { (number | string | BN) } threshold,
     * @returns { Result<Result<boolean, ReturnTypes.Error>, ReturnTypes.LangError> }
     */
    dappOperatorIsHumanUser(
        userAccount: ArgumentTypes.AccountId,
        threshold: number | string | BN,
        __options: GasLimit
    ): Promise<QueryReturnType<Result<Result<boolean, ReturnTypes.Error>, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'dappOperatorIsHumanUser',
            [userAccount, threshold],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(45, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * dappOperatorLastCorrectCaptcha
     *
     * @param { ArgumentTypes.AccountId } userAccount,
     * @returns { Result<Result<ReturnTypes.LastCorrectCaptcha, ReturnTypes.Error>, ReturnTypes.LangError> }
     */
    dappOperatorLastCorrectCaptcha(
        userAccount: ArgumentTypes.AccountId,
        __options: GasLimit
    ): Promise<
        QueryReturnType<Result<Result<ReturnTypes.LastCorrectCaptcha, ReturnTypes.Error>, ReturnTypes.LangError>>
    > {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'dappOperatorLastCorrectCaptcha',
            [userAccount],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(48, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * getUser
     *
     * @param { ArgumentTypes.AccountId } userAccount,
     * @returns { Result<Result<ReturnTypes.User, ReturnTypes.Error>, ReturnTypes.LangError> }
     */
    getUser(
        userAccount: ArgumentTypes.AccountId,
        __options: GasLimit
    ): Promise<QueryReturnType<Result<Result<ReturnTypes.User, ReturnTypes.Error>, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'getUser',
            [userAccount],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(51, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * getCommit
     *
     * @param { ArgumentTypes.Hash } commitId,
     * @returns { Result<Result<ReturnTypes.Commit, ReturnTypes.Error>, ReturnTypes.LangError> }
     */
    getCommit(
        commitId: ArgumentTypes.Hash,
        __options: GasLimit
    ): Promise<QueryReturnType<Result<Result<ReturnTypes.Commit, ReturnTypes.Error>, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'getCommit',
            [commitId],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(54, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * listProvidersByAccounts
     *
     * @param { Array<ArgumentTypes.AccountId> } providerAccounts,
     * @returns { Result<Result<Array<ReturnTypes.Provider>, ReturnTypes.Error>, ReturnTypes.LangError> }
     */
    listProvidersByAccounts(
        providerAccounts: Array<ArgumentTypes.AccountId>,
        __options: GasLimit
    ): Promise<QueryReturnType<Result<Result<Array<ReturnTypes.Provider>, ReturnTypes.Error>, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'listProvidersByAccounts',
            [providerAccounts],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(56, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * listProvidersByStatus
     *
     * @param { Array<ArgumentTypes.GovernanceStatus> } statuses,
     * @returns { Result<Result<Array<ReturnTypes.Provider>, ReturnTypes.Error>, ReturnTypes.LangError> }
     */
    listProvidersByStatus(
        statuses: Array<ArgumentTypes.GovernanceStatus>,
        __options: GasLimit
    ): Promise<QueryReturnType<Result<Result<Array<ReturnTypes.Provider>, ReturnTypes.Error>, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'listProvidersByStatus',
            [statuses],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(56, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * getRandomActiveProvider
     *
     * @param { ArgumentTypes.AccountId } userAccount,
     * @param { ArgumentTypes.AccountId } dappContract,
     * @returns { Result<Result<ReturnTypes.RandomProvider, ReturnTypes.Error>, ReturnTypes.LangError> }
     */
    getRandomActiveProvider(
        userAccount: ArgumentTypes.AccountId,
        dappContract: ArgumentTypes.AccountId,
        __options: GasLimit
    ): Promise<QueryReturnType<Result<Result<ReturnTypes.RandomProvider, ReturnTypes.Error>, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'getRandomActiveProvider',
            [userAccount, dappContract],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(59, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * getAllProviderAccounts
     *
     * @returns { Result<Result<Array<ReturnTypes.AccountId>, ReturnTypes.Error>, ReturnTypes.LangError> }
     */
    getAllProviderAccounts(
        __options: GasLimit
    ): Promise<
        QueryReturnType<Result<Result<Array<ReturnTypes.AccountId>, ReturnTypes.Error>, ReturnTypes.LangError>>
    > {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'getAllProviderAccounts',
            [],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(62, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * getRandomNumber
     *
     * @param { (string | number | BN) } len,
     * @param { ArgumentTypes.AccountId } userAccount,
     * @param { ArgumentTypes.AccountId } dappContract,
     * @returns { Result<ReturnNumber, ReturnTypes.LangError> }
     */
    getRandomNumber(
        len: string | number | BN,
        userAccount: ArgumentTypes.AccountId,
        dappContract: ArgumentTypes.AccountId,
        __options: GasLimit
    ): Promise<QueryReturnType<Result<ReturnNumber, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'getRandomNumber',
            [len, userAccount, dappContract],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(28, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * terminate
     *
     * @returns { void }
     */
    terminate(__options: GasLimit) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'terminate',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [],
            __options
        )
    }

    /**
     * withdraw
     *
     * @param { (string | number | BN) } amount,
     * @returns { void }
     */
    withdraw(amount: string | number | BN, __options: GasLimit) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'withdraw',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [amount],
            __options
        )
    }

    /**
     * setCodeHash
     *
     * @param { Array<(number | string | BN)> } codeHash,
     * @returns { void }
     */
    setCodeHash(codeHash: Array<number | string | BN>, __options: GasLimit) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'setCodeHash',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [codeHash],
            __options
        )
    }
}
