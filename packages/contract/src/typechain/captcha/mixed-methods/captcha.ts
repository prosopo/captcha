/* This file is auto-generated */

import type { ContractPromise } from '@polkadot/api-contract';
import type { ApiPromise } from '@polkadot/api';
import type { KeyringPair } from '@polkadot/keyring/types';
import type { GasLimit, GasLimitAndRequiredValue, Result } from '@727-ventures/typechain-types';
import type { QueryReturnType } from '@727-ventures/typechain-types';
import { queryOkJSON, queryJSON, handleReturnType } from '@727-ventures/typechain-types';
import { txSignAndSend } from '@727-ventures/typechain-types';
import type * as ArgumentTypes from '../types-arguments/captcha';
import type * as ReturnTypes from '../types-returns/captcha';
import type BN from 'bn.js';
//@ts-ignore
import {ReturnNumber} from '@727-ventures/typechain-types';
import {getTypeDescription} from './../shared/utils';
// @ts-ignore
import type {EventRecord} from "@polkadot/api/submittable";
import {decodeEvents} from "../shared/utils";
import DATA_TYPE_DESCRIPTIONS from '../data/captcha.json';
import EVENT_DATA_TYPE_DESCRIPTIONS from '../event-data/captcha.json';


export default class Methods {
	readonly __nativeContract : ContractPromise;
	readonly __keyringPair : KeyringPair;
	readonly __callerAddress : string;
	readonly __apiPromise: ApiPromise;

	constructor(
		apiPromise : ApiPromise,
		nativeContract : ContractPromise,
		keyringPair : KeyringPair,
	) {
		this.__apiPromise = apiPromise;
		this.__nativeContract = nativeContract;
		this.__keyringPair = keyringPair;
		this.__callerAddress = keyringPair.address;
	}

	/**
	* verifySr25519
	*
	* @param { Array<(number | string | BN)> } signature,
	* @param { Array<(number | string | BN)> } payload,
	* @returns { Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> }
	*/
	"verifySr25519" (
		signature: Array<(number | string | BN)>,
		payload: Array<(number | string | BN)>,
		__options: GasLimit,
	): Promise< QueryReturnType< Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "verifySr25519", [signature, payload], __options, (result) => { return handleReturnType(result, getTypeDescription(16, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* getCaller
	*
	* @returns { Result<ReturnTypes.AccountId, ReturnTypes.LangError> }
	*/
	"getCaller" (
		__options: GasLimit,
	): Promise< QueryReturnType< Result<ReturnTypes.AccountId, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "getCaller", [], __options, (result) => { return handleReturnType(result, getTypeDescription(19, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* getPayees
	*
	* @returns { Result<Array<ReturnTypes.Payee>, ReturnTypes.LangError> }
	*/
	"getPayees" (
		__options: GasLimit,
	): Promise< QueryReturnType< Result<Array<ReturnTypes.Payee>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "getPayees", [], __options, (result) => { return handleReturnType(result, getTypeDescription(20, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* getDappPayees
	*
	* @returns { Result<Array<ReturnTypes.DappPayee>, ReturnTypes.LangError> }
	*/
	"getDappPayees" (
		__options: GasLimit,
	): Promise< QueryReturnType< Result<Array<ReturnTypes.DappPayee>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "getDappPayees", [], __options, (result) => { return handleReturnType(result, getTypeDescription(23, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* getStatuses
	*
	* @returns { Result<Array<ReturnTypes.GovernanceStatus>, ReturnTypes.LangError> }
	*/
	"getStatuses" (
		__options: GasLimit,
	): Promise< QueryReturnType< Result<Array<ReturnTypes.GovernanceStatus>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "getStatuses", [], __options, (result) => { return handleReturnType(result, getTypeDescription(26, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* getProviderStakeThreshold
	*
	* @returns { Result<ReturnNumber, ReturnTypes.LangError> }
	*/
	"getProviderStakeThreshold" (
		__options: GasLimit,
	): Promise< QueryReturnType< Result<ReturnNumber, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "getProviderStakeThreshold", [], __options, (result) => { return handleReturnType(result, getTypeDescription(29, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* getDappStakeThreshold
	*
	* @returns { Result<ReturnNumber, ReturnTypes.LangError> }
	*/
	"getDappStakeThreshold" (
		__options: GasLimit,
	): Promise< QueryReturnType< Result<ReturnNumber, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "getDappStakeThreshold", [], __options, (result) => { return handleReturnType(result, getTypeDescription(29, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* providerRegister
	*
	* @param { Array<(number | string | BN)> } url,
	* @param { (number | string | BN) } fee,
	* @param { ArgumentTypes.Payee } payee,
	* @returns { void }
	*/
	"providerRegister" (
		url: Array<(number | string | BN)>,
		fee: (number | string | BN),
		payee: ArgumentTypes.Payee,
		__options: GasLimitAndRequiredValue,
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
	* @returns { void }
	*/
	"providerUpdate" (
		url: Array<(number | string | BN)>,
		fee: (number | string | BN),
		payee: ArgumentTypes.Payee,
		__options: GasLimitAndRequiredValue,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "providerUpdate", (events: EventRecord) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [url, fee, payee], __options);
	}

	/**
	* providerDeactivate
	*
	* @returns { void }
	*/
	"providerDeactivate" (
		__options: GasLimit,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "providerDeactivate", (events: EventRecord) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [], __options);
	}

	/**
	* providerDeregister
	*
	* @returns { void }
	*/
	"providerDeregister" (
		__options: GasLimit,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "providerDeregister", (events: EventRecord) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [], __options);
	}

	/**
	* providerFund
	*
	* @returns { void }
	*/
	"providerFund" (
		__options: GasLimitAndRequiredValue,
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
	* @returns { void }
	*/
	"providerSetDataset" (
		datasetId: ArgumentTypes.Hash,
		datasetIdContent: ArgumentTypes.Hash,
		__options: GasLimit,
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
	* @returns { void }
	*/
	"dappRegister" (
		contract: ArgumentTypes.AccountId,
		payee: ArgumentTypes.DappPayee,
		__options: GasLimitAndRequiredValue,
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
	* @returns { void }
	*/
	"dappUpdate" (
		contract: ArgumentTypes.AccountId,
		payee: ArgumentTypes.DappPayee,
		owner: ArgumentTypes.AccountId,
		__options: GasLimitAndRequiredValue,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "dappUpdate", (events: EventRecord) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [contract, payee, owner], __options);
	}

	/**
	* dappFund
	*
	* @param { ArgumentTypes.AccountId } contract,
	* @returns { void }
	*/
	"dappFund" (
		contract: ArgumentTypes.AccountId,
		__options: GasLimitAndRequiredValue,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "dappFund", (events: EventRecord) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [contract], __options);
	}

	/**
	* dappDeregister
	*
	* @param { ArgumentTypes.AccountId } contract,
	* @returns { void }
	*/
	"dappDeregister" (
		contract: ArgumentTypes.AccountId,
		__options: GasLimit,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "dappDeregister", (events: EventRecord) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [contract], __options);
	}

	/**
	* dappDeactivate
	*
	* @param { ArgumentTypes.AccountId } contract,
	* @returns { void }
	*/
	"dappDeactivate" (
		contract: ArgumentTypes.AccountId,
		__options: GasLimit,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "dappDeactivate", (events: EventRecord) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [contract], __options);
	}

	/**
	* providerCommit
	*
	* @param { ArgumentTypes.Commit } commit,
	* @returns { void }
	*/
	"providerCommit" (
		commit: ArgumentTypes.Commit,
		__options: GasLimit,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "providerCommit", (events: EventRecord) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [commit], __options);
	}

	/**
	* providerCommitMany
	*
	* @param { Array<ArgumentTypes.Commit> } commits,
	* @returns { void }
	*/
	"providerCommitMany" (
		commits: Array<ArgumentTypes.Commit>,
		__options: GasLimit,
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
	* @returns { Result<Result<boolean, ReturnTypes.Error>, ReturnTypes.LangError> }
	*/
	"dappOperatorIsHumanUser" (
		user: ArgumentTypes.AccountId,
		threshold: (number | string | BN),
		__options: GasLimit,
	): Promise< QueryReturnType< Result<Result<boolean, ReturnTypes.Error>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "dappOperatorIsHumanUser", [user, threshold], __options, (result) => { return handleReturnType(result, getTypeDescription(33, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* dappOperatorLastCorrectCaptcha
	*
	* @param { ArgumentTypes.AccountId } user,
	* @returns { Result<Result<ReturnTypes.LastCorrectCaptcha, ReturnTypes.Error>, ReturnTypes.LangError> }
	*/
	"dappOperatorLastCorrectCaptcha" (
		user: ArgumentTypes.AccountId,
		__options: GasLimit,
	): Promise< QueryReturnType< Result<Result<ReturnTypes.LastCorrectCaptcha, ReturnTypes.Error>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "dappOperatorLastCorrectCaptcha", [user], __options, (result) => { return handleReturnType(result, getTypeDescription(36, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* getCaptchaData
	*
	* @param { ArgumentTypes.Hash } datasetId,
	* @returns { Result<Result<ReturnTypes.CaptchaData, ReturnTypes.Error>, ReturnTypes.LangError> }
	*/
	"getCaptchaData" (
		datasetId: ArgumentTypes.Hash,
		__options: GasLimit,
	): Promise< QueryReturnType< Result<Result<ReturnTypes.CaptchaData, ReturnTypes.Error>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "getCaptchaData", [datasetId], __options, (result) => { return handleReturnType(result, getTypeDescription(39, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* getDappUser
	*
	* @param { ArgumentTypes.AccountId } dappUserId,
	* @returns { Result<Result<ReturnTypes.User, ReturnTypes.Error>, ReturnTypes.LangError> }
	*/
	"getDappUser" (
		dappUserId: ArgumentTypes.AccountId,
		__options: GasLimit,
	): Promise< QueryReturnType< Result<Result<ReturnTypes.User, ReturnTypes.Error>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "getDappUser", [dappUserId], __options, (result) => { return handleReturnType(result, getTypeDescription(42, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* getProviderDetails
	*
	* @param { ArgumentTypes.AccountId } accountid,
	* @returns { Result<Result<ReturnTypes.Provider, ReturnTypes.Error>, ReturnTypes.LangError> }
	*/
	"getProviderDetails" (
		accountid: ArgumentTypes.AccountId,
		__options: GasLimit,
	): Promise< QueryReturnType< Result<Result<ReturnTypes.Provider, ReturnTypes.Error>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "getProviderDetails", [accountid], __options, (result) => { return handleReturnType(result, getTypeDescription(45, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* getDappDetails
	*
	* @param { ArgumentTypes.AccountId } contract,
	* @returns { Result<Result<ReturnTypes.Dapp, ReturnTypes.Error>, ReturnTypes.LangError> }
	*/
	"getDappDetails" (
		contract: ArgumentTypes.AccountId,
		__options: GasLimit,
	): Promise< QueryReturnType< Result<Result<ReturnTypes.Dapp, ReturnTypes.Error>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "getDappDetails", [contract], __options, (result) => { return handleReturnType(result, getTypeDescription(48, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* getCaptchaSolutionCommitment
	*
	* @param { ArgumentTypes.Hash } captchaSolutionCommitmentId,
	* @returns { Result<Result<ReturnTypes.Commit, ReturnTypes.Error>, ReturnTypes.LangError> }
	*/
	"getCaptchaSolutionCommitment" (
		captchaSolutionCommitmentId: ArgumentTypes.Hash,
		__options: GasLimit,
	): Promise< QueryReturnType< Result<Result<ReturnTypes.Commit, ReturnTypes.Error>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "getCaptchaSolutionCommitment", [captchaSolutionCommitmentId], __options, (result) => { return handleReturnType(result, getTypeDescription(51, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* getDappBalance
	*
	* @param { ArgumentTypes.AccountId } dapp,
	* @returns { Result<Result<ReturnNumber, ReturnTypes.Error>, ReturnTypes.LangError> }
	*/
	"getDappBalance" (
		dapp: ArgumentTypes.AccountId,
		__options: GasLimit,
	): Promise< QueryReturnType< Result<Result<ReturnNumber, ReturnTypes.Error>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "getDappBalance", [dapp], __options, (result) => { return handleReturnType(result, getTypeDescription(53, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* getProviderBalance
	*
	* @param { ArgumentTypes.AccountId } provider,
	* @returns { Result<Result<ReturnNumber, ReturnTypes.Error>, ReturnTypes.LangError> }
	*/
	"getProviderBalance" (
		provider: ArgumentTypes.AccountId,
		__options: GasLimit,
	): Promise< QueryReturnType< Result<Result<ReturnNumber, ReturnTypes.Error>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "getProviderBalance", [provider], __options, (result) => { return handleReturnType(result, getTypeDescription(53, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* listProvidersByIds
	*
	* @param { Array<ArgumentTypes.AccountId> } providerIds,
	* @returns { Result<Result<Array<ReturnTypes.Provider>, ReturnTypes.Error>, ReturnTypes.LangError> }
	*/
	"listProvidersByIds" (
		providerIds: Array<ArgumentTypes.AccountId>,
		__options: GasLimit,
	): Promise< QueryReturnType< Result<Result<Array<ReturnTypes.Provider>, ReturnTypes.Error>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "listProvidersByIds", [providerIds], __options, (result) => { return handleReturnType(result, getTypeDescription(55, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* listProvidersByStatus
	*
	* @param { Array<ArgumentTypes.GovernanceStatus> } statuses,
	* @returns { Result<Result<Array<ReturnTypes.Provider>, ReturnTypes.Error>, ReturnTypes.LangError> }
	*/
	"listProvidersByStatus" (
		statuses: Array<ArgumentTypes.GovernanceStatus>,
		__options: GasLimit,
	): Promise< QueryReturnType< Result<Result<Array<ReturnTypes.Provider>, ReturnTypes.Error>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "listProvidersByStatus", [statuses], __options, (result) => { return handleReturnType(result, getTypeDescription(55, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* getRandomActiveProvider
	*
	* @param { ArgumentTypes.AccountId } userAccount,
	* @param { ArgumentTypes.AccountId } dappContractAccount,
	* @returns { Result<Result<ReturnTypes.RandomProvider, ReturnTypes.Error>, ReturnTypes.LangError> }
	*/
	"getRandomActiveProvider" (
		userAccount: ArgumentTypes.AccountId,
		dappContractAccount: ArgumentTypes.AccountId,
		__options: GasLimit,
	): Promise< QueryReturnType< Result<Result<ReturnTypes.RandomProvider, ReturnTypes.Error>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "getRandomActiveProvider", [userAccount, dappContractAccount], __options, (result) => { return handleReturnType(result, getTypeDescription(58, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* getAllProviderIds
	*
	* @returns { Result<Result<Array<ReturnTypes.AccountId>, ReturnTypes.Error>, ReturnTypes.LangError> }
	*/
	"getAllProviderIds" (
		__options: GasLimit,
	): Promise< QueryReturnType< Result<Result<Array<ReturnTypes.AccountId>, ReturnTypes.Error>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "getAllProviderIds", [], __options, (result) => { return handleReturnType(result, getTypeDescription(61, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* getRandomNumber
	*
	* @param { (string | number | BN) } len,
	* @param { ArgumentTypes.AccountId } userAccount,
	* @param { ArgumentTypes.AccountId } dappAccount,
	* @returns { Result<ReturnNumber, ReturnTypes.LangError> }
	*/
	"getRandomNumber" (
		len: (string | number | BN),
		userAccount: ArgumentTypes.AccountId,
		dappAccount: ArgumentTypes.AccountId,
		__options: GasLimit,
	): Promise< QueryReturnType< Result<ReturnNumber, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "getRandomNumber", [len, userAccount, dappAccount], __options, (result) => { return handleReturnType(result, getTypeDescription(29, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* terminate
	*
	* @returns { void }
	*/
	"terminate" (
		__options: GasLimit,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "terminate", (events: EventRecord) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [], __options);
	}

	/**
	* withdraw
	*
	* @param { (string | number | BN) } amount,
	* @returns { void }
	*/
	"withdraw" (
		amount: (string | number | BN),
		__options: GasLimit,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "withdraw", (events: EventRecord) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [amount], __options);
	}

	/**
	* setCodeHash
	*
	* @param { Array<(number | string | BN)> } codeHash,
	* @returns { void }
	*/
	"setCodeHash" (
		codeHash: Array<(number | string | BN)>,
		__options: GasLimit,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "setCodeHash", (events: EventRecord) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [codeHash], __options);
	}

	/**
	* setAdmin
	*
	* @param { ArgumentTypes.AccountId } newAdmin,
	* @returns { void }
	*/
	"setAdmin" (
		newAdmin: ArgumentTypes.AccountId,
		__options: GasLimit,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "setAdmin", (events: EventRecord) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [newAdmin], __options);
	}

}