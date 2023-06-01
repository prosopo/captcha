/* This file is auto-generated */

import type { ContractPromise } from '@polkadot/api-contract';
import type { KeyringPair } from '@polkadot/keyring/types';
import type { ApiPromise } from '@polkadot/api';
import type { GasLimit, GasLimitAndRequiredValue, Result } from '@727-ventures/typechain-types';
import { txSignAndSend } from '@727-ventures/typechain-types';
import type * as ArgumentTypes from '../types-arguments/captcha';
import type BN from 'bn.js';
// @ts-ignore
import type {EventRecord} from "@polkadot/api/submittable";
import {decodeEvents} from "../shared/utils";
import EVENT_DATA_TYPE_DESCRIPTIONS from '../event-data/captcha.json';


export default class Methods {
	private __nativeContract : ContractPromise;
	private __keyringPair : KeyringPair;
	private __apiPromise: ApiPromise;

	constructor(
		apiPromise: ApiPromise,
		nativeContract : ContractPromise,
		keyringPair : KeyringPair,
	) {
		this.__apiPromise = apiPromise;
		this.__nativeContract = nativeContract;
		this.__keyringPair = keyringPair;
	}

	/**
	* verifySr25519
	*
	* @param { Array<(number | string | BN)> } signature,
	* @param { Array<(number | string | BN)> } payload,
	*/
	"verifySr25519" (
		signature: Array<(number | string | BN)>,
		payload: Array<(number | string | BN)>,
		__options ? : GasLimit,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "verifySr25519", (events: EventRecord) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [signature, payload], __options);
	}

	/**
	* getCaller
	*
	*/
	"getCaller" (
		__options ? : GasLimit,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "getCaller", (events: EventRecord) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [], __options);
	}

	/**
	* getPayees
	*
	*/
	"getPayees" (
		__options ? : GasLimit,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "getPayees", (events: EventRecord) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [], __options);
	}

	/**
	* getDappPayees
	*
	*/
	"getDappPayees" (
		__options ? : GasLimit,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "getDappPayees", (events: EventRecord) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [], __options);
	}

	/**
	* getStatuses
	*
	*/
	"getStatuses" (
		__options ? : GasLimit,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "getStatuses", (events: EventRecord) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [], __options);
	}

	/**
	* getProviderStakeThreshold
	*
	*/
	"getProviderStakeThreshold" (
		__options ? : GasLimit,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "getProviderStakeThreshold", (events: EventRecord) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [], __options);
	}

	/**
	* getDappStakeThreshold
	*
	*/
	"getDappStakeThreshold" (
		__options ? : GasLimit,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "getDappStakeThreshold", (events: EventRecord) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [], __options);
	}

	/**
	* providerRegister
	*
	* @param { Array<(number | string | BN)> } url,
	* @param { (number | string | BN) } fee,
	* @param { ArgumentTypes.Payee } payee,
	*/
	"providerRegister" (
		url: Array<(number | string | BN)>,
		fee: (number | string | BN),
		payee: ArgumentTypes.Payee,
		__options ? : GasLimitAndRequiredValue,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "providerRegister", (events: EventRecord) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [url, fee, payee], __options);
	}

	/**
	* providerUpdate
	*
	* @param { Array<(number | string | BN)> } url,
	* @param { (number | string | BN) } fee,
	* @param { ArgumentTypes.Payee } payee,
	*/
	"providerUpdate" (
		url: Array<(number | string | BN)>,
		fee: (number | string | BN),
		payee: ArgumentTypes.Payee,
		__options ? : GasLimitAndRequiredValue,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "providerUpdate", (events: EventRecord) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [url, fee, payee], __options);
	}

	/**
	* providerDeactivate
	*
	*/
	"providerDeactivate" (
		__options ? : GasLimit,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "providerDeactivate", (events: EventRecord) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [], __options);
	}

	/**
	* providerDeregister
	*
	*/
	"providerDeregister" (
		__options ? : GasLimit,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "providerDeregister", (events: EventRecord) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [], __options);
	}

	/**
	* providerFund
	*
	*/
	"providerFund" (
		__options ? : GasLimitAndRequiredValue,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "providerFund", (events: EventRecord) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [], __options);
	}

	/**
	* providerSetDataset
	*
	* @param { ArgumentTypes.Hash } datasetId,
	* @param { ArgumentTypes.Hash } datasetIdContent,
	*/
	"providerSetDataset" (
		datasetId: ArgumentTypes.Hash,
		datasetIdContent: ArgumentTypes.Hash,
		__options ? : GasLimit,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "providerSetDataset", (events: EventRecord) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [datasetId, datasetIdContent], __options);
	}

	/**
	* dappRegister
	*
	* @param { ArgumentTypes.AccountId } contract,
	* @param { ArgumentTypes.DappPayee } payee,
	*/
	"dappRegister" (
		contract: ArgumentTypes.AccountId,
		payee: ArgumentTypes.DappPayee,
		__options ? : GasLimitAndRequiredValue,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "dappRegister", (events: EventRecord) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [contract, payee], __options);
	}

	/**
	* dappUpdate
	*
	* @param { ArgumentTypes.AccountId } contract,
	* @param { ArgumentTypes.DappPayee } payee,
	* @param { ArgumentTypes.AccountId } owner,
	*/
	"dappUpdate" (
		contract: ArgumentTypes.AccountId,
		payee: ArgumentTypes.DappPayee,
		owner: ArgumentTypes.AccountId,
		__options ? : GasLimitAndRequiredValue,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "dappUpdate", (events: EventRecord) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [contract, payee, owner], __options);
	}

	/**
	* dappFund
	*
	* @param { ArgumentTypes.AccountId } contract,
	*/
	"dappFund" (
		contract: ArgumentTypes.AccountId,
		__options ? : GasLimitAndRequiredValue,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "dappFund", (events: EventRecord) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [contract], __options);
	}

	/**
	* dappDeregister
	*
	* @param { ArgumentTypes.AccountId } contract,
	*/
	"dappDeregister" (
		contract: ArgumentTypes.AccountId,
		__options ? : GasLimit,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "dappDeregister", (events: EventRecord) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [contract], __options);
	}

	/**
	* dappDeactivate
	*
	* @param { ArgumentTypes.AccountId } contract,
	*/
	"dappDeactivate" (
		contract: ArgumentTypes.AccountId,
		__options ? : GasLimit,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "dappDeactivate", (events: EventRecord) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [contract], __options);
	}

	/**
	* providerCommit
	*
	* @param { ArgumentTypes.Commit } commit,
	*/
	"providerCommit" (
		commit: ArgumentTypes.Commit,
		__options ? : GasLimit,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "providerCommit", (events: EventRecord) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [commit], __options);
	}

	/**
	* providerCommitMany
	*
	* @param { Array<ArgumentTypes.Commit> } commits,
	*/
	"providerCommitMany" (
		commits: Array<ArgumentTypes.Commit>,
		__options ? : GasLimit,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "providerCommitMany", (events: EventRecord) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [commits], __options);
	}

	/**
	* dappOperatorIsHumanUser
	*
	* @param { ArgumentTypes.AccountId } user,
	* @param { (number | string | BN) } threshold,
	*/
	"dappOperatorIsHumanUser" (
		user: ArgumentTypes.AccountId,
		threshold: (number | string | BN),
		__options ? : GasLimit,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "dappOperatorIsHumanUser", (events: EventRecord) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [user, threshold], __options);
	}

	/**
	* dappOperatorLastCorrectCaptcha
	*
	* @param { ArgumentTypes.AccountId } user,
	*/
	"dappOperatorLastCorrectCaptcha" (
		user: ArgumentTypes.AccountId,
		__options ? : GasLimit,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "dappOperatorLastCorrectCaptcha", (events: EventRecord) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [user], __options);
	}

	/**
	* getCaptchaData
	*
	* @param { ArgumentTypes.Hash } datasetId,
	*/
	"getCaptchaData" (
		datasetId: ArgumentTypes.Hash,
		__options ? : GasLimit,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "getCaptchaData", (events: EventRecord) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [datasetId], __options);
	}

	/**
	* getDappUser
	*
	* @param { ArgumentTypes.AccountId } dappUserId,
	*/
	"getDappUser" (
		dappUserId: ArgumentTypes.AccountId,
		__options ? : GasLimit,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "getDappUser", (events: EventRecord) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [dappUserId], __options);
	}

	/**
	* getProviderDetails
	*
	* @param { ArgumentTypes.AccountId } accountid,
	*/
	"getProviderDetails" (
		accountid: ArgumentTypes.AccountId,
		__options ? : GasLimit,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "getProviderDetails", (events: EventRecord) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [accountid], __options);
	}

	/**
	* getDappDetails
	*
	* @param { ArgumentTypes.AccountId } contract,
	*/
	"getDappDetails" (
		contract: ArgumentTypes.AccountId,
		__options ? : GasLimit,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "getDappDetails", (events: EventRecord) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [contract], __options);
	}

	/**
	* getCaptchaSolutionCommitment
	*
	* @param { ArgumentTypes.Hash } captchaSolutionCommitmentId,
	*/
	"getCaptchaSolutionCommitment" (
		captchaSolutionCommitmentId: ArgumentTypes.Hash,
		__options ? : GasLimit,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "getCaptchaSolutionCommitment", (events: EventRecord) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [captchaSolutionCommitmentId], __options);
	}

	/**
	* getDappBalance
	*
	* @param { ArgumentTypes.AccountId } dapp,
	*/
	"getDappBalance" (
		dapp: ArgumentTypes.AccountId,
		__options ? : GasLimit,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "getDappBalance", (events: EventRecord) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [dapp], __options);
	}

	/**
	* getProviderBalance
	*
	* @param { ArgumentTypes.AccountId } provider,
	*/
	"getProviderBalance" (
		provider: ArgumentTypes.AccountId,
		__options ? : GasLimit,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "getProviderBalance", (events: EventRecord) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [provider], __options);
	}

	/**
	* listProvidersByIds
	*
	* @param { Array<ArgumentTypes.AccountId> } providerIds,
	*/
	"listProvidersByIds" (
		providerIds: Array<ArgumentTypes.AccountId>,
		__options ? : GasLimit,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "listProvidersByIds", (events: EventRecord) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [providerIds], __options);
	}

	/**
	* listProvidersByStatus
	*
	* @param { Array<ArgumentTypes.GovernanceStatus> } statuses,
	*/
	"listProvidersByStatus" (
		statuses: Array<ArgumentTypes.GovernanceStatus>,
		__options ? : GasLimit,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "listProvidersByStatus", (events: EventRecord) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [statuses], __options);
	}

	/**
	* getRandomActiveProvider
	*
	* @param { ArgumentTypes.AccountId } userAccount,
	* @param { ArgumentTypes.AccountId } dappContractAccount,
	*/
	"getRandomActiveProvider" (
		userAccount: ArgumentTypes.AccountId,
		dappContractAccount: ArgumentTypes.AccountId,
		__options ? : GasLimit,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "getRandomActiveProvider", (events: EventRecord) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [userAccount, dappContractAccount], __options);
	}

	/**
	* getAllProviderIds
	*
	*/
	"getAllProviderIds" (
		__options ? : GasLimit,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "getAllProviderIds", (events: EventRecord) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [], __options);
	}

	/**
	* getRandomNumber
	*
	* @param { (string | number | BN) } len,
	* @param { ArgumentTypes.AccountId } userAccount,
	* @param { ArgumentTypes.AccountId } dappAccount,
	*/
	"getRandomNumber" (
		len: (string | number | BN),
		userAccount: ArgumentTypes.AccountId,
		dappAccount: ArgumentTypes.AccountId,
		__options ? : GasLimit,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "getRandomNumber", (events: EventRecord) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [len, userAccount, dappAccount], __options);
	}

	/**
	* terminate
	*
	*/
	"terminate" (
		__options ? : GasLimit,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "terminate", (events: EventRecord) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [], __options);
	}

	/**
	* withdraw
	*
	* @param { (string | number | BN) } amount,
	*/
	"withdraw" (
		amount: (string | number | BN),
		__options ? : GasLimit,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "withdraw", (events: EventRecord) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [amount], __options);
	}

	/**
	* setCodeHash
	*
	* @param { Array<(number | string | BN)> } codeHash,
	*/
	"setCodeHash" (
		codeHash: Array<(number | string | BN)>,
		__options ? : GasLimit,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "setCodeHash", (events: EventRecord) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [codeHash], __options);
	}

	/**
	* setAdmin
	*
	* @param { ArgumentTypes.AccountId } newAdmin,
	*/
	"setAdmin" (
		newAdmin: ArgumentTypes.AccountId,
		__options ? : GasLimit,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "setAdmin", (events: EventRecord) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [newAdmin], __options);
	}

}