/* This file is auto-generated */

import { txSignAndSend } from '@prosopo/typechain-types'
import type * as ArgumentTypes from '../types-arguments/captcha.js'
import type { ApiPromise } from '@polkadot/api'
import type { ContractPromise } from '@polkadot/api-contract'
import type { GasLimit, GasLimitAndRequiredValue } from '@prosopo/typechain-types'
import type { KeyringPair } from '@polkadot/keyring/types'
import type BN from 'bn.js'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { decodeEvents } from '../shared/utils.js'
import EVENT_DATA_TYPE_DESCRIPTIONS from '../event-data/captcha.json' assert { type: 'json' }
import type { EventRecord } from '@polkadot/types/interfaces'

export default class Methods {
    readonly __nativeContract: ContractPromise
    readonly __keyringPair: KeyringPair
    readonly __apiPromise: ApiPromise

    constructor(apiPromise: ApiPromise, nativeContract: ContractPromise, keyringPair: KeyringPair) {
        this.__apiPromise = apiPromise
        this.__nativeContract = nativeContract
        this.__keyringPair = keyringPair
    }

    /**
     * getGitCommitId
     *
     */
    getGitCommitId(__options?: GasLimit) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'getGitCommitId',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [],
            __options
        )
    }

    /**
     * getAdmin
     *
     */
    getAdmin(__options?: GasLimit) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'getAdmin',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [],
            __options
        )
    }

    /**
     * getPayees
     *
     */
    getPayees(__options?: GasLimit) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'getPayees',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [],
            __options
        )
    }

    /**
     * getDappPayees
     *
     */
    getDappPayees(__options?: GasLimit) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'getDappPayees',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [],
            __options
        )
    }

    /**
     * getStatuses
     *
     */
    getStatuses(__options?: GasLimit) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'getStatuses',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [],
            __options
        )
    }

    /**
     * getProviderStakeThreshold
     *
     */
    getProviderStakeThreshold(__options?: GasLimit) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'getProviderStakeThreshold',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [],
            __options
        )
    }

    /**
     * getDappStakeThreshold
     *
     */
    getDappStakeThreshold(__options?: GasLimit) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'getDappStakeThreshold',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [],
            __options
        )
    }

    /**
     * getMaxProviderFee
     *
     */
    getMaxProviderFee(__options?: GasLimit) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'getMaxProviderFee',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [],
            __options
        )
    }

    /**
     * getMinNumActiveProviders
     *
     */
    getMinNumActiveProviders(__options?: GasLimit) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'getMinNumActiveProviders',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [],
            __options
        )
    }

    /**
     * getBlockTime
     *
     */
    getBlockTime(__options?: GasLimit) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'getBlockTime',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [],
            __options
        )
    }

    /**
     * getMaxUserHistoryAgeSeconds
     *
     */
    getMaxUserHistoryAgeSeconds(__options?: GasLimit) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'getMaxUserHistoryAgeSeconds',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [],
            __options
        )
    }

    /**
     * getMaxUserHistoryLen
     *
     */
    getMaxUserHistoryLen(__options?: GasLimit) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'getMaxUserHistoryLen',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [],
            __options
        )
    }

    /**
     * getMaxUserHistoryAgeBlocks
     *
     */
    getMaxUserHistoryAgeBlocks(__options?: GasLimit) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'getMaxUserHistoryAgeBlocks',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
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
        __options?: GasLimitAndRequiredValue
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
     */
    providerUpdate(
        url: Array<number | string | BN>,
        fee: number | string | BN,
        payee: ArgumentTypes.Payee,
        __options?: GasLimitAndRequiredValue
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
     */
    providerDeactivate(__options?: GasLimit) {
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
     */
    providerDeregister(__options?: GasLimit) {
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
     */
    getProvider(account: ArgumentTypes.AccountId, __options?: GasLimit) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'getProvider',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [account],
            __options
        )
    }

    /**
     * providerFund
     *
     */
    providerFund(__options?: GasLimitAndRequiredValue) {
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
     */
    providerSetDataset(
        datasetId: ArgumentTypes.Hash,
        datasetIdContent: ArgumentTypes.Hash,
        __options?: GasLimitAndRequiredValue
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
     */
    getDapp(contract: ArgumentTypes.AccountId, __options?: GasLimit) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'getDapp',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [contract],
            __options
        )
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
        __options?: GasLimitAndRequiredValue
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
     */
    dappUpdate(
        contract: ArgumentTypes.AccountId,
        payee: ArgumentTypes.DappPayee,
        owner: ArgumentTypes.AccountId,
        __options?: GasLimitAndRequiredValue
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
     */
    dappFund(contract: ArgumentTypes.AccountId, __options?: GasLimitAndRequiredValue) {
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
     */
    dappDeregister(contract: ArgumentTypes.AccountId, __options?: GasLimit) {
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
     */
    dappDeactivate(contract: ArgumentTypes.AccountId, __options?: GasLimit) {
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
     */
    getUserHistorySummary(userAccount: ArgumentTypes.AccountId, __options?: GasLimit) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'getUserHistorySummary',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [userAccount],
            __options
        )
    }

    /**
     * providerCommit
     *
     * @param { ArgumentTypes.Commit } commit,
     */
    providerCommit(commit: ArgumentTypes.Commit, __options?: GasLimit) {
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
     */
    providerCommitMany(commits: Array<ArgumentTypes.Commit>, __options?: GasLimit) {
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
     */
    dappOperatorIsHumanUser(
        userAccount: ArgumentTypes.AccountId,
        threshold: number | string | BN,
        __options?: GasLimit
    ) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'dappOperatorIsHumanUser',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [userAccount, threshold],
            __options
        )
    }

    /**
     * dappOperatorLastCorrectCaptcha
     *
     * @param { ArgumentTypes.AccountId } userAccount,
     */
    dappOperatorLastCorrectCaptcha(userAccount: ArgumentTypes.AccountId, __options?: GasLimit) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'dappOperatorLastCorrectCaptcha',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [userAccount],
            __options
        )
    }

    /**
     * getUser
     *
     * @param { ArgumentTypes.AccountId } userAccount,
     */
    getUser(userAccount: ArgumentTypes.AccountId, __options?: GasLimit) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'getUser',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [userAccount],
            __options
        )
    }

    /**
     * getCommit
     *
     * @param { ArgumentTypes.Hash } commitId,
     */
    getCommit(commitId: ArgumentTypes.Hash, __options?: GasLimit) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'getCommit',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [commitId],
            __options
        )
    }

    /**
     * listProvidersByAccounts
     *
     * @param { Array<ArgumentTypes.AccountId> } providerAccounts,
     */
    listProvidersByAccounts(providerAccounts: Array<ArgumentTypes.AccountId>, __options?: GasLimit) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'listProvidersByAccounts',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [providerAccounts],
            __options
        )
    }

    /**
     * listProvidersByStatus
     *
     * @param { Array<ArgumentTypes.GovernanceStatus> } statuses,
     */
    listProvidersByStatus(statuses: Array<ArgumentTypes.GovernanceStatus>, __options?: GasLimit) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'listProvidersByStatus',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
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
        __options?: GasLimit
    ) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'getRandomActiveProvider',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [userAccount, dappContract],
            __options
        )
    }

    /**
     * getAllProviderAccounts
     *
     */
    getAllProviderAccounts(__options?: GasLimit) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'getAllProviderAccounts',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
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
        __options?: GasLimit
    ) {
        return txSignAndSend(
            this.__apiPromise,
            this.__nativeContract,
            this.__keyringPair,
            'getRandomNumber',
            (events: EventRecord[]) => {
                return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS)
            },
            [len, userAccount, dappContract],
            __options
        )
    }

    /**
     * terminate
     *
     */
    terminate(__options?: GasLimit) {
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
     */
    withdraw(amount: string | number | BN, __options?: GasLimit) {
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
     */
    setCodeHash(codeHash: Array<number | string | BN>, __options?: GasLimit) {
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
