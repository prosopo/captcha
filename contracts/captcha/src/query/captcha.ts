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
import type * as ArgumentTypes from '../types-arguments/captcha'
import type * as ReturnTypes from '../types-returns/captcha'
import type { ApiPromise } from '@polkadot/api'
import type { ContractPromise } from '@polkadot/api-contract'
import type { GasLimit, GasLimitAndRequiredValue, Result } from '@prosopo/typechain-types'
import type { QueryReturnType } from '@prosopo/typechain-types'
import type BN from 'bn.js'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { ReturnNumber } from '@prosopo/typechain-types'
import { getTypeDescription } from './../shared/utils'
import DATA_TYPE_DESCRIPTIONS from '../data/captcha.json'

export default class Methods {
    readonly __nativeContract: ContractPromise
    readonly __apiPromise: ApiPromise
    readonly __callerAddress: string

    constructor(nativeContract: ContractPromise, nativeApi: ApiPromise, callerAddress: string) {
        this.__nativeContract = nativeContract
        this.__callerAddress = callerAddress
        this.__apiPromise = nativeApi
    }

    /**
     * getGitCommitId
     *
     * @returns { Result<Array<number>, ReturnTypes.LangError> }
     */
    getGitCommitId(__options?: GasLimit): Promise<QueryReturnType<Result<Array<number>, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'getGitCommitId',
            [],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(53, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * getAdmin
     *
     * @returns { Result<ReturnTypes.AccountId, ReturnTypes.LangError> }
     */
    getAdmin(__options?: GasLimit): Promise<QueryReturnType<Result<ReturnTypes.AccountId, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'getAdmin',
            [],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(55, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * getPayees
     *
     * @returns { Result<Array<ReturnTypes.Payee>, ReturnTypes.LangError> }
     */
    getPayees(__options?: GasLimit): Promise<QueryReturnType<Result<Array<ReturnTypes.Payee>, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'getPayees',
            [],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(56, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * getDappPayees
     *
     * @returns { Result<Array<ReturnTypes.DappPayee>, ReturnTypes.LangError> }
     */
    getDappPayees(
        __options?: GasLimit
    ): Promise<QueryReturnType<Result<Array<ReturnTypes.DappPayee>, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'getDappPayees',
            [],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(58, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * getStatuses
     *
     * @returns { Result<Array<ReturnTypes.GovernanceStatus>, ReturnTypes.LangError> }
     */
    getStatuses(
        __options?: GasLimit
    ): Promise<QueryReturnType<Result<Array<ReturnTypes.GovernanceStatus>, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'getStatuses',
            [],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(60, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * getProviderStakeThreshold
     *
     * @returns { Result<ReturnNumber, ReturnTypes.LangError> }
     */
    getProviderStakeThreshold(
        __options?: GasLimit
    ): Promise<QueryReturnType<Result<ReturnNumber, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'getProviderStakeThreshold',
            [],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(62, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * getDappStakeThreshold
     *
     * @returns { Result<ReturnNumber, ReturnTypes.LangError> }
     */
    getDappStakeThreshold(__options?: GasLimit): Promise<QueryReturnType<Result<ReturnNumber, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'getDappStakeThreshold',
            [],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(62, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * getMaxProviderFee
     *
     * @returns { Result<number, ReturnTypes.LangError> }
     */
    getMaxProviderFee(__options?: GasLimit): Promise<QueryReturnType<Result<number, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'getMaxProviderFee',
            [],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(63, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * getMinNumActiveProviders
     *
     * @returns { Result<number, ReturnTypes.LangError> }
     */
    getMinNumActiveProviders(__options?: GasLimit): Promise<QueryReturnType<Result<number, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'getMinNumActiveProviders',
            [],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(64, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * getBlockTime
     *
     * @returns { Result<number, ReturnTypes.LangError> }
     */
    getBlockTime(__options?: GasLimit): Promise<QueryReturnType<Result<number, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'getBlockTime',
            [],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(64, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * getMaxUserHistoryAgeSeconds
     *
     * @returns { Result<number, ReturnTypes.LangError> }
     */
    getMaxUserHistoryAgeSeconds(__options?: GasLimit): Promise<QueryReturnType<Result<number, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'getMaxUserHistoryAgeSeconds',
            [],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(63, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * getMaxUserHistoryLen
     *
     * @returns { Result<number, ReturnTypes.LangError> }
     */
    getMaxUserHistoryLen(__options?: GasLimit): Promise<QueryReturnType<Result<number, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'getMaxUserHistoryLen',
            [],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(64, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * getMaxUserHistoryAgeBlocks
     *
     * @returns { Result<number, ReturnTypes.LangError> }
     */
    getMaxUserHistoryAgeBlocks(__options?: GasLimit): Promise<QueryReturnType<Result<number, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'getMaxUserHistoryAgeBlocks',
            [],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(63, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * providerRegister
     *
     * @param { Array<(number | string | BN)> } url,
     * @param { (number | string | BN) } fee,
     * @param { ArgumentTypes.Payee } payee,
     * @returns { Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> }
     */
    providerRegister(
        url: Array<number | string | BN>,
        fee: number | string | BN,
        payee: ArgumentTypes.Payee,
        __options?: GasLimitAndRequiredValue
    ): Promise<QueryReturnType<Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'providerRegister',
            [url, fee, payee],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(48, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * providerUpdate
     *
     * @param { Array<(number | string | BN)> } url,
     * @param { (number | string | BN) } fee,
     * @param { ArgumentTypes.Payee } payee,
     * @returns { Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> }
     */
    providerUpdate(
        url: Array<number | string | BN>,
        fee: number | string | BN,
        payee: ArgumentTypes.Payee,
        __options?: GasLimitAndRequiredValue
    ): Promise<QueryReturnType<Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'providerUpdate',
            [url, fee, payee],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(48, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * providerDeactivate
     *
     * @returns { Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> }
     */
    providerDeactivate(
        __options?: GasLimit
    ): Promise<QueryReturnType<Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'providerDeactivate',
            [],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(48, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * providerDeregister
     *
     * @returns { Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> }
     */
    providerDeregister(
        __options?: GasLimit
    ): Promise<QueryReturnType<Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'providerDeregister',
            [],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(48, DATA_TYPE_DESCRIPTIONS))
            }
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
        __options?: GasLimit
    ): Promise<QueryReturnType<Result<Result<ReturnTypes.Provider, ReturnTypes.Error>, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'getProvider',
            [account],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(66, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * providerFund
     *
     * @returns { Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> }
     */
    providerFund(
        __options?: GasLimitAndRequiredValue
    ): Promise<QueryReturnType<Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'providerFund',
            [],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(48, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * providerSetDataset
     *
     * @param { ArgumentTypes.Hash } datasetId,
     * @param { ArgumentTypes.Hash } datasetIdContent,
     * @returns { Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> }
     */
    providerSetDataset(
        datasetId: ArgumentTypes.Hash,
        datasetIdContent: ArgumentTypes.Hash,
        __options?: GasLimitAndRequiredValue
    ): Promise<QueryReturnType<Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'providerSetDataset',
            [datasetId, datasetIdContent],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(48, DATA_TYPE_DESCRIPTIONS))
            }
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
        __options?: GasLimit
    ): Promise<QueryReturnType<Result<Result<ReturnTypes.Dapp, ReturnTypes.Error>, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'getDapp',
            [contract],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(68, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * dappRegister
     *
     * @param { ArgumentTypes.AccountId } contract,
     * @param { ArgumentTypes.DappPayee } payee,
     * @returns { Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> }
     */
    dappRegister(
        contract: ArgumentTypes.AccountId,
        payee: ArgumentTypes.DappPayee,
        __options?: GasLimitAndRequiredValue
    ): Promise<QueryReturnType<Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'dappRegister',
            [contract, payee],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(48, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * dappUpdate
     *
     * @param { ArgumentTypes.AccountId } contract,
     * @param { ArgumentTypes.DappPayee } payee,
     * @param { ArgumentTypes.AccountId } owner,
     * @returns { Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> }
     */
    dappUpdate(
        contract: ArgumentTypes.AccountId,
        payee: ArgumentTypes.DappPayee,
        owner: ArgumentTypes.AccountId,
        __options?: GasLimitAndRequiredValue
    ): Promise<QueryReturnType<Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'dappUpdate',
            [contract, payee, owner],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(48, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * dappFund
     *
     * @param { ArgumentTypes.AccountId } contract,
     * @returns { Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> }
     */
    dappFund(
        contract: ArgumentTypes.AccountId,
        __options?: GasLimitAndRequiredValue
    ): Promise<QueryReturnType<Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'dappFund',
            [contract],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(48, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * dappDeregister
     *
     * @param { ArgumentTypes.AccountId } contract,
     * @returns { Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> }
     */
    dappDeregister(
        contract: ArgumentTypes.AccountId,
        __options?: GasLimit
    ): Promise<QueryReturnType<Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'dappDeregister',
            [contract],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(48, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * dappDeactivate
     *
     * @param { ArgumentTypes.AccountId } contract,
     * @returns { Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> }
     */
    dappDeactivate(
        contract: ArgumentTypes.AccountId,
        __options?: GasLimit
    ): Promise<QueryReturnType<Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'dappDeactivate',
            [contract],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(48, DATA_TYPE_DESCRIPTIONS))
            }
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
        __options?: GasLimit
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
                return handleReturnType(result, getTypeDescription(70, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * providerCommit
     *
     * @param { ArgumentTypes.Commit } commit,
     * @returns { Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> }
     */
    providerCommit(
        commit: ArgumentTypes.Commit,
        __options?: GasLimit
    ): Promise<QueryReturnType<Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'providerCommit',
            [commit],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(48, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * providerCommitMany
     *
     * @param { Array<ArgumentTypes.Commit> } commits,
     * @returns { Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> }
     */
    providerCommitMany(
        commits: Array<ArgumentTypes.Commit>,
        __options?: GasLimit
    ): Promise<QueryReturnType<Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'providerCommitMany',
            [commits],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(48, DATA_TYPE_DESCRIPTIONS))
            }
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
        __options?: GasLimit
    ): Promise<QueryReturnType<Result<Result<boolean, ReturnTypes.Error>, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'dappOperatorIsHumanUser',
            [userAccount, threshold],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(74, DATA_TYPE_DESCRIPTIONS))
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
        __options?: GasLimit
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
                return handleReturnType(result, getTypeDescription(77, DATA_TYPE_DESCRIPTIONS))
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
        __options?: GasLimit
    ): Promise<QueryReturnType<Result<Result<ReturnTypes.User, ReturnTypes.Error>, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'getUser',
            [userAccount],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(80, DATA_TYPE_DESCRIPTIONS))
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
        __options?: GasLimit
    ): Promise<QueryReturnType<Result<Result<ReturnTypes.Commit, ReturnTypes.Error>, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'getCommit',
            [commitId],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(82, DATA_TYPE_DESCRIPTIONS))
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
        __options?: GasLimit
    ): Promise<QueryReturnType<Result<Result<Array<ReturnTypes.Provider>, ReturnTypes.Error>, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'listProvidersByAccounts',
            [providerAccounts],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(84, DATA_TYPE_DESCRIPTIONS))
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
        __options?: GasLimit
    ): Promise<QueryReturnType<Result<Result<Array<ReturnTypes.Provider>, ReturnTypes.Error>, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'listProvidersByStatus',
            [statuses],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(84, DATA_TYPE_DESCRIPTIONS))
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
        __options?: GasLimit
    ): Promise<QueryReturnType<Result<Result<ReturnTypes.RandomProvider, ReturnTypes.Error>, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'getRandomActiveProvider',
            [userAccount, dappContract],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(87, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * getAllProviderAccounts
     *
     * @returns { Result<Result<Array<ReturnTypes.AccountId>, ReturnTypes.Error>, ReturnTypes.LangError> }
     */
    getAllProviderAccounts(
        __options?: GasLimit
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
                return handleReturnType(result, getTypeDescription(90, DATA_TYPE_DESCRIPTIONS))
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
        __options?: GasLimit
    ): Promise<QueryReturnType<Result<ReturnNumber, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'getRandomNumber',
            [len, userAccount, dappContract],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(62, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * terminate
     *
     * @returns { Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> }
     */
    terminate(
        __options?: GasLimit
    ): Promise<QueryReturnType<Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'terminate',
            [],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(48, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * withdraw
     *
     * @param { (string | number | BN) } amount,
     * @returns { Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> }
     */
    withdraw(
        amount: string | number | BN,
        __options?: GasLimit
    ): Promise<QueryReturnType<Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'withdraw',
            [amount],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(48, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }

    /**
     * setCodeHash
     *
     * @param { ArgumentTypes.Hash } codeHash,
     * @returns { Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> }
     */
    setCodeHash(
        codeHash: ArgumentTypes.Hash,
        __options?: GasLimit
    ): Promise<QueryReturnType<Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError>>> {
        return queryOkJSON(
            this.__apiPromise,
            this.__nativeContract,
            this.__callerAddress,
            'setCodeHash',
            [codeHash],
            __options,
            (result) => {
                return handleReturnType(result, getTypeDescription(48, DATA_TYPE_DESCRIPTIONS))
            }
        )
    }
}
