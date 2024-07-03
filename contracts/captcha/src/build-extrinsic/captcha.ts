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

import { buildSubmittableExtrinsic } from '@prosopo/typechain-types'
import type * as ArgumentTypes from '../types-arguments/captcha'
import type { ApiPromise } from '@polkadot/api'
import type { ContractPromise } from '@polkadot/api-contract'
import type { GasLimit, GasLimitAndRequiredValue } from '@prosopo/typechain-types'
import type BN from 'bn.js'

export default class Methods {
    readonly __nativeContract: ContractPromise
    readonly __apiPromise: ApiPromise

    constructor(nativeContract: ContractPromise, apiPromise: ApiPromise) {
        this.__nativeContract = nativeContract
        this.__apiPromise = apiPromise
    }
    /**
     * getGitCommitId
     *
     */
    getGitCommitId(__options: GasLimit) {
        return buildSubmittableExtrinsic(this.__apiPromise, this.__nativeContract, 'getGitCommitId', [], __options)
    }

    /**
     * getAdmin
     *
     */
    getAdmin(__options: GasLimit) {
        return buildSubmittableExtrinsic(this.__apiPromise, this.__nativeContract, 'getAdmin', [], __options)
    }

    /**
     * getPayees
     *
     */
    getPayees(__options: GasLimit) {
        return buildSubmittableExtrinsic(this.__apiPromise, this.__nativeContract, 'getPayees', [], __options)
    }

    /**
     * getDappPayees
     *
     */
    getDappPayees(__options: GasLimit) {
        return buildSubmittableExtrinsic(this.__apiPromise, this.__nativeContract, 'getDappPayees', [], __options)
    }

    /**
     * getStatuses
     *
     */
    getStatuses(__options: GasLimit) {
        return buildSubmittableExtrinsic(this.__apiPromise, this.__nativeContract, 'getStatuses', [], __options)
    }

    /**
     * getProviderStakeThreshold
     *
     */
    getProviderStakeThreshold(__options: GasLimit) {
        return buildSubmittableExtrinsic(
            this.__apiPromise,
            this.__nativeContract,
            'getProviderStakeThreshold',
            [],
            __options
        )
    }

    /**
     * getDappStakeThreshold
     *
     */
    getDappStakeThreshold(__options: GasLimit) {
        return buildSubmittableExtrinsic(
            this.__apiPromise,
            this.__nativeContract,
            'getDappStakeThreshold',
            [],
            __options
        )
    }

    /**
     * getMaxProviderFee
     *
     */
    getMaxProviderFee(__options: GasLimit) {
        return buildSubmittableExtrinsic(this.__apiPromise, this.__nativeContract, 'getMaxProviderFee', [], __options)
    }

    /**
     * getMinNumActiveProviders
     *
     */
    getMinNumActiveProviders(__options: GasLimit) {
        return buildSubmittableExtrinsic(
            this.__apiPromise,
            this.__nativeContract,
            'getMinNumActiveProviders',
            [],
            __options
        )
    }

    /**
     * getBlockTime
     *
     */
    getBlockTime(__options: GasLimit) {
        return buildSubmittableExtrinsic(this.__apiPromise, this.__nativeContract, 'getBlockTime', [], __options)
    }

    /**
     * getMaxUserHistoryAgeSeconds
     *
     */
    getMaxUserHistoryAgeSeconds(__options: GasLimit) {
        return buildSubmittableExtrinsic(
            this.__apiPromise,
            this.__nativeContract,
            'getMaxUserHistoryAgeSeconds',
            [],
            __options
        )
    }

    /**
     * getMaxUserHistoryLen
     *
     */
    getMaxUserHistoryLen(__options: GasLimit) {
        return buildSubmittableExtrinsic(
            this.__apiPromise,
            this.__nativeContract,
            'getMaxUserHistoryLen',
            [],
            __options
        )
    }

    /**
     * getMaxUserHistoryAgeBlocks
     *
     */
    getMaxUserHistoryAgeBlocks(__options: GasLimit) {
        return buildSubmittableExtrinsic(
            this.__apiPromise,
            this.__nativeContract,
            'getMaxUserHistoryAgeBlocks',
            [],
            __options
        )
    }

    /**
     * providerRegister
     *
     * @param { Array<(number | string | BN)> } url,
     * @param { (number | string | BN) } fee,
     * @param { ArgumentTypes.Payee } payee,
     */
    providerRegister(
        url: Array<number | string | BN>,
        fee: number | string | BN,
        payee: ArgumentTypes.Payee,
        __options: GasLimitAndRequiredValue
    ) {
        return buildSubmittableExtrinsic(
            this.__apiPromise,
            this.__nativeContract,
            'providerRegister',
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
     */
    providerUpdate(
        url: Array<number | string | BN>,
        fee: number | string | BN,
        payee: ArgumentTypes.Payee,
        __options: GasLimitAndRequiredValue
    ) {
        return buildSubmittableExtrinsic(
            this.__apiPromise,
            this.__nativeContract,
            'providerUpdate',
            [url, fee, payee],
            __options
        )
    }

    /**
     * providerDeactivate
     *
     */
    providerDeactivate(__options: GasLimit) {
        return buildSubmittableExtrinsic(this.__apiPromise, this.__nativeContract, 'providerDeactivate', [], __options)
    }

    /**
     * providerDeregister
     *
     */
    providerDeregister(__options: GasLimit) {
        return buildSubmittableExtrinsic(this.__apiPromise, this.__nativeContract, 'providerDeregister', [], __options)
    }

    /**
     * getProvider
     *
     * @param { ArgumentTypes.AccountId } account,
     */
    getProvider(account: ArgumentTypes.AccountId, __options: GasLimit) {
        return buildSubmittableExtrinsic(this.__apiPromise, this.__nativeContract, 'getProvider', [account], __options)
    }

    /**
     * providerFund
     *
     */
    providerFund(__options: GasLimitAndRequiredValue) {
        return buildSubmittableExtrinsic(this.__apiPromise, this.__nativeContract, 'providerFund', [], __options)
    }

    /**
     * providerSetDataset
     *
     * @param { ArgumentTypes.Hash } datasetId,
     * @param { ArgumentTypes.Hash } datasetIdContent,
     */
    providerSetDataset(
        datasetId: ArgumentTypes.Hash,
        datasetIdContent: ArgumentTypes.Hash,
        __options: GasLimitAndRequiredValue
    ) {
        return buildSubmittableExtrinsic(
            this.__apiPromise,
            this.__nativeContract,
            'providerSetDataset',
            [datasetId, datasetIdContent],
            __options
        )
    }

    /**
     * getDapp
     *
     * @param { ArgumentTypes.AccountId } contract,
     */
    getDapp(contract: ArgumentTypes.AccountId, __options: GasLimit) {
        return buildSubmittableExtrinsic(this.__apiPromise, this.__nativeContract, 'getDapp', [contract], __options)
    }

    /**
     * dappRegister
     *
     * @param { ArgumentTypes.AccountId } contract,
     * @param { ArgumentTypes.DappPayee } payee,
     */
    dappRegister(
        contract: ArgumentTypes.AccountId,
        payee: ArgumentTypes.DappPayee,
        __options: GasLimitAndRequiredValue
    ) {
        return buildSubmittableExtrinsic(
            this.__apiPromise,
            this.__nativeContract,
            'dappRegister',
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
     */
    dappUpdate(
        contract: ArgumentTypes.AccountId,
        payee: ArgumentTypes.DappPayee,
        owner: ArgumentTypes.AccountId,
        __options: GasLimitAndRequiredValue
    ) {
        return buildSubmittableExtrinsic(
            this.__apiPromise,
            this.__nativeContract,
            'dappUpdate',
            [contract, payee, owner],
            __options
        )
    }

    /**
     * dappFund
     *
     * @param { ArgumentTypes.AccountId } contract,
     */
    dappFund(contract: ArgumentTypes.AccountId, __options: GasLimitAndRequiredValue) {
        return buildSubmittableExtrinsic(this.__apiPromise, this.__nativeContract, 'dappFund', [contract], __options)
    }

    /**
     * dappDeregister
     *
     * @param { ArgumentTypes.AccountId } contract,
     */
    dappDeregister(contract: ArgumentTypes.AccountId, __options: GasLimit) {
        return buildSubmittableExtrinsic(
            this.__apiPromise,
            this.__nativeContract,
            'dappDeregister',
            [contract],
            __options
        )
    }

    /**
     * dappDeactivate
     *
     * @param { ArgumentTypes.AccountId } contract,
     */
    dappDeactivate(contract: ArgumentTypes.AccountId, __options: GasLimit) {
        return buildSubmittableExtrinsic(
            this.__apiPromise,
            this.__nativeContract,
            'dappDeactivate',
            [contract],
            __options
        )
    }

    /**
     * getUserHistorySummary
     *
     * @param { ArgumentTypes.AccountId } userAccount,
     */
    getUserHistorySummary(userAccount: ArgumentTypes.AccountId, __options: GasLimit) {
        return buildSubmittableExtrinsic(
            this.__apiPromise,
            this.__nativeContract,
            'getUserHistorySummary',
            [userAccount],
            __options
        )
    }

    /**
     * providerCommit
     *
     * @param { ArgumentTypes.Commit } commit,
     */
    providerCommit(commit: ArgumentTypes.Commit, __options: GasLimit) {
        return buildSubmittableExtrinsic(
            this.__apiPromise,
            this.__nativeContract,
            'providerCommit',
            [commit],
            __options
        )
    }

    /**
     * providerCommitMany
     *
     * @param { Array<ArgumentTypes.Commit> } commits,
     */
    providerCommitMany(commits: Array<ArgumentTypes.Commit>, __options: GasLimit) {
        return buildSubmittableExtrinsic(
            this.__apiPromise,
            this.__nativeContract,
            'providerCommitMany',
            [commits],
            __options
        )
    }

    /**
     * dappOperatorIsHumanUser
     *
     * @param { ArgumentTypes.AccountId } userAccount,
     * @param { (number | string | BN) } threshold,
     */
    dappOperatorIsHumanUser(
        userAccount: ArgumentTypes.AccountId,
        threshold: number | string | BN,
        __options: GasLimit
    ) {
        return buildSubmittableExtrinsic(
            this.__apiPromise,
            this.__nativeContract,
            'dappOperatorIsHumanUser',
            [userAccount, threshold],
            __options
        )
    }

    /**
     * dappOperatorLastCorrectCaptcha
     *
     * @param { ArgumentTypes.AccountId } userAccount,
     */
    dappOperatorLastCorrectCaptcha(userAccount: ArgumentTypes.AccountId, __options: GasLimit) {
        return buildSubmittableExtrinsic(
            this.__apiPromise,
            this.__nativeContract,
            'dappOperatorLastCorrectCaptcha',
            [userAccount],
            __options
        )
    }

    /**
     * getUser
     *
     * @param { ArgumentTypes.AccountId } userAccount,
     */
    getUser(userAccount: ArgumentTypes.AccountId, __options: GasLimit) {
        return buildSubmittableExtrinsic(this.__apiPromise, this.__nativeContract, 'getUser', [userAccount], __options)
    }

    /**
     * getCommit
     *
     * @param { ArgumentTypes.Hash } commitId,
     */
    getCommit(commitId: ArgumentTypes.Hash, __options: GasLimit) {
        return buildSubmittableExtrinsic(this.__apiPromise, this.__nativeContract, 'getCommit', [commitId], __options)
    }

    /**
     * listProvidersByAccounts
     *
     * @param { Array<ArgumentTypes.AccountId> } providerAccounts,
     */
    listProvidersByAccounts(providerAccounts: Array<ArgumentTypes.AccountId>, __options: GasLimit) {
        return buildSubmittableExtrinsic(
            this.__apiPromise,
            this.__nativeContract,
            'listProvidersByAccounts',
            [providerAccounts],
            __options
        )
    }

    /**
     * listProvidersByStatus
     *
     * @param { Array<ArgumentTypes.GovernanceStatus> } statuses,
     */
    listProvidersByStatus(statuses: Array<ArgumentTypes.GovernanceStatus>, __options: GasLimit) {
        return buildSubmittableExtrinsic(
            this.__apiPromise,
            this.__nativeContract,
            'listProvidersByStatus',
            [statuses],
            __options
        )
    }

    /**
     * getRandomActiveProvider
     *
     * @param { ArgumentTypes.AccountId } userAccount,
     * @param { ArgumentTypes.AccountId } dappContract,
     */
    getRandomActiveProvider(
        userAccount: ArgumentTypes.AccountId,
        dappContract: ArgumentTypes.AccountId,
        __options: GasLimit
    ) {
        return buildSubmittableExtrinsic(
            this.__apiPromise,
            this.__nativeContract,
            'getRandomActiveProvider',
            [userAccount, dappContract],
            __options
        )
    }

    /**
     * getAllProviderAccounts
     *
     */
    getAllProviderAccounts(__options: GasLimit) {
        return buildSubmittableExtrinsic(
            this.__apiPromise,
            this.__nativeContract,
            'getAllProviderAccounts',
            [],
            __options
        )
    }

    /**
     * getRandomNumber
     *
     * @param { (string | number | BN) } len,
     * @param { ArgumentTypes.AccountId } userAccount,
     * @param { ArgumentTypes.AccountId } dappContract,
     */
    getRandomNumber(
        len: string | number | BN,
        userAccount: ArgumentTypes.AccountId,
        dappContract: ArgumentTypes.AccountId,
        __options: GasLimit
    ) {
        return buildSubmittableExtrinsic(
            this.__apiPromise,
            this.__nativeContract,
            'getRandomNumber',
            [len, userAccount, dappContract],
            __options
        )
    }

    /**
     * terminate
     *
     */
    terminate(__options: GasLimit) {
        return buildSubmittableExtrinsic(this.__apiPromise, this.__nativeContract, 'terminate', [], __options)
    }

    /**
     * withdraw
     *
     * @param { (string | number | BN) } amount,
     */
    withdraw(amount: string | number | BN, __options: GasLimit) {
        return buildSubmittableExtrinsic(this.__apiPromise, this.__nativeContract, 'withdraw', [amount], __options)
    }

    /**
     * setCodeHash
     *
     * @param { ArgumentTypes.Hash } codeHash,
     */
    setCodeHash(codeHash: ArgumentTypes.Hash, __options: GasLimit) {
        return buildSubmittableExtrinsic(this.__apiPromise, this.__nativeContract, 'setCodeHash', [codeHash], __options)
    }
}
