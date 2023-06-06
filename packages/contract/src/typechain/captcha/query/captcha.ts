/* This file is auto-generated */

import type { ContractPromise } from '@polkadot/api-contract';
import type { ApiPromise } from '@polkadot/api';
import type { GasLimit, GasLimitAndRequiredValue, Result } from '@727-ventures/typechain-types';
import type { QueryReturnType } from '@727-ventures/typechain-types';
import { queryJSON, queryOkJSON, handleReturnType } from '@727-ventures/typechain-types';
import type * as ArgumentTypes from '../types-arguments/captcha';
import type * as ReturnTypes from '../types-returns/captcha';
import type BN from 'bn.js';
//@ts-ignore
import {ReturnNumber} from '@727-ventures/typechain-types';
import {getTypeDescription} from './../shared/utils';
import DATA_TYPE_DESCRIPTIONS from '../data/captcha.json';


export default class Methods {
	private __nativeContract : ContractPromise;
	private __apiPromise: ApiPromise;
	private __callerAddress : string;

	constructor(
		nativeContract : ContractPromise,
		nativeApi : ApiPromise,
		callerAddress : string,
	) {
		this.__nativeContract = nativeContract;
		this.__callerAddress = callerAddress;
		this.__apiPromise = nativeApi;
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
		__options ? : GasLimit,
	): Promise< QueryReturnType< Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "verifySr25519", [signature, payload], __options , (result) => { return handleReturnType(result, getTypeDescription(16, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* getCaller
	*
	* @returns { Result<ReturnTypes.AccountId, ReturnTypes.LangError> }
	*/
	"getCaller" (
		__options ? : GasLimit,
	): Promise< QueryReturnType< Result<ReturnTypes.AccountId, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "getCaller", [], __options , (result) => { return handleReturnType(result, getTypeDescription(19, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* getPayees
	*
	* @returns { Result<Array<ReturnTypes.Payee>, ReturnTypes.LangError> }
	*/
	"getPayees" (
		__options ? : GasLimit,
	): Promise< QueryReturnType< Result<Array<ReturnTypes.Payee>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "getPayees", [], __options , (result) => { return handleReturnType(result, getTypeDescription(20, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* getDappPayees
	*
	* @returns { Result<Array<ReturnTypes.DappPayee>, ReturnTypes.LangError> }
	*/
	"getDappPayees" (
		__options ? : GasLimit,
	): Promise< QueryReturnType< Result<Array<ReturnTypes.DappPayee>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "getDappPayees", [], __options , (result) => { return handleReturnType(result, getTypeDescription(23, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* getStatuses
	*
	* @returns { Result<Array<ReturnTypes.GovernanceStatus>, ReturnTypes.LangError> }
	*/
	"getStatuses" (
		__options ? : GasLimit,
	): Promise< QueryReturnType< Result<Array<ReturnTypes.GovernanceStatus>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "getStatuses", [], __options , (result) => { return handleReturnType(result, getTypeDescription(26, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* getProviderStakeThreshold
	*
	* @returns { Result<ReturnNumber, ReturnTypes.LangError> }
	*/
	"getProviderStakeThreshold" (
		__options ? : GasLimit,
	): Promise< QueryReturnType< Result<ReturnNumber, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "getProviderStakeThreshold", [], __options , (result) => { return handleReturnType(result, getTypeDescription(29, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* getDappStakeThreshold
	*
	* @returns { Result<ReturnNumber, ReturnTypes.LangError> }
	*/
	"getDappStakeThreshold" (
		__options ? : GasLimit,
	): Promise< QueryReturnType< Result<ReturnNumber, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "getDappStakeThreshold", [], __options , (result) => { return handleReturnType(result, getTypeDescription(29, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* providerRegister
	*
	* @param { Array<(number | string | BN)> } url,
	* @param { (number | string | BN) } fee,
	* @param { ArgumentTypes.Payee } payee,
	* @returns { Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> }
	*/
	"providerRegister" (
		url: Array<(number | string | BN)>,
		fee: (number | string | BN),
		payee: ArgumentTypes.Payee,
		__options ? : GasLimitAndRequiredValue,
	): Promise< QueryReturnType< Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "providerRegister", [url, fee, payee], __options , (result) => { return handleReturnType(result, getTypeDescription(16, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* providerUpdate
	*
	* @param { Array<(number | string | BN)> } url,
	* @param { (number | string | BN) } fee,
	* @param { ArgumentTypes.Payee } payee,
	* @returns { Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> }
	*/
	"providerUpdate" (
		url: Array<(number | string | BN)>,
		fee: (number | string | BN),
		payee: ArgumentTypes.Payee,
		__options ? : GasLimitAndRequiredValue,
	): Promise< QueryReturnType< Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "providerUpdate", [url, fee, payee], __options , (result) => { return handleReturnType(result, getTypeDescription(16, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* providerDeactivate
	*
	* @returns { Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> }
	*/
	"providerDeactivate" (
		__options ? : GasLimit,
	): Promise< QueryReturnType< Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "providerDeactivate", [], __options , (result) => { return handleReturnType(result, getTypeDescription(16, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* providerDeregister
	*
	* @returns { Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> }
	*/
	"providerDeregister" (
		__options ? : GasLimit,
	): Promise< QueryReturnType< Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "providerDeregister", [], __options , (result) => { return handleReturnType(result, getTypeDescription(16, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* providerFund
	*
	* @returns { Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> }
	*/
	"providerFund" (
		__options ? : GasLimitAndRequiredValue,
	): Promise< QueryReturnType< Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "providerFund", [], __options , (result) => { return handleReturnType(result, getTypeDescription(16, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* providerSetDataset
	*
	* @param { ArgumentTypes.Hash } datasetId,
	* @param { ArgumentTypes.Hash } datasetIdContent,
	* @returns { Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> }
	*/
	"providerSetDataset" (
		datasetId: ArgumentTypes.Hash,
		datasetIdContent: ArgumentTypes.Hash,
		__options ? : GasLimit,
	): Promise< QueryReturnType< Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "providerSetDataset", [datasetId, datasetIdContent], __options , (result) => { return handleReturnType(result, getTypeDescription(16, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* dappRegister
	*
	* @param { ArgumentTypes.AccountId } contract,
	* @param { ArgumentTypes.DappPayee } payee,
	* @returns { Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> }
	*/
	"dappRegister" (
		contract: ArgumentTypes.AccountId,
		payee: ArgumentTypes.DappPayee,
		__options ? : GasLimitAndRequiredValue,
	): Promise< QueryReturnType< Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "dappRegister", [contract, payee], __options , (result) => { return handleReturnType(result, getTypeDescription(16, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* dappUpdate
	*
	* @param { ArgumentTypes.AccountId } contract,
	* @param { ArgumentTypes.DappPayee } payee,
	* @param { ArgumentTypes.AccountId } owner,
	* @returns { Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> }
	*/
	"dappUpdate" (
		contract: ArgumentTypes.AccountId,
		payee: ArgumentTypes.DappPayee,
		owner: ArgumentTypes.AccountId,
		__options ? : GasLimitAndRequiredValue,
	): Promise< QueryReturnType< Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "dappUpdate", [contract, payee, owner], __options , (result) => { return handleReturnType(result, getTypeDescription(16, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* dappFund
	*
	* @param { ArgumentTypes.AccountId } contract,
	* @returns { Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> }
	*/
	"dappFund" (
		contract: ArgumentTypes.AccountId,
		__options ? : GasLimitAndRequiredValue,
	): Promise< QueryReturnType< Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "dappFund", [contract], __options , (result) => { return handleReturnType(result, getTypeDescription(16, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* dappDeregister
	*
	* @param { ArgumentTypes.AccountId } contract,
	* @returns { Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> }
	*/
	"dappDeregister" (
		contract: ArgumentTypes.AccountId,
		__options ? : GasLimit,
	): Promise< QueryReturnType< Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "dappDeregister", [contract], __options , (result) => { return handleReturnType(result, getTypeDescription(16, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* dappDeactivate
	*
	* @param { ArgumentTypes.AccountId } contract,
	* @returns { Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> }
	*/
	"dappDeactivate" (
		contract: ArgumentTypes.AccountId,
		__options ? : GasLimit,
	): Promise< QueryReturnType< Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "dappDeactivate", [contract], __options , (result) => { return handleReturnType(result, getTypeDescription(16, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* providerCommit
	*
	* @param { ArgumentTypes.Commit } commit,
	* @returns { Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> }
	*/
	"providerCommit" (
		commit: ArgumentTypes.Commit,
		__options ? : GasLimit,
	): Promise< QueryReturnType< Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "providerCommit", [commit], __options , (result) => { return handleReturnType(result, getTypeDescription(16, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* providerCommitMany
	*
	* @param { Array<ArgumentTypes.Commit> } commits,
	* @returns { Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> }
	*/
	"providerCommitMany" (
		commits: Array<ArgumentTypes.Commit>,
		__options ? : GasLimit,
	): Promise< QueryReturnType< Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "providerCommitMany", [commits], __options , (result) => { return handleReturnType(result, getTypeDescription(16, DATA_TYPE_DESCRIPTIONS)); });
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
		__options ? : GasLimit,
	): Promise< QueryReturnType< Result<Result<boolean, ReturnTypes.Error>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "dappOperatorIsHumanUser", [user, threshold], __options , (result) => { return handleReturnType(result, getTypeDescription(33, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* dappOperatorLastCorrectCaptcha
	*
	* @param { ArgumentTypes.AccountId } user,
	* @returns { Result<Result<ReturnTypes.LastCorrectCaptcha, ReturnTypes.Error>, ReturnTypes.LangError> }
	*/
	"dappOperatorLastCorrectCaptcha" (
		user: ArgumentTypes.AccountId,
		__options ? : GasLimit,
	): Promise< QueryReturnType< Result<Result<ReturnTypes.LastCorrectCaptcha, ReturnTypes.Error>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "dappOperatorLastCorrectCaptcha", [user], __options , (result) => { return handleReturnType(result, getTypeDescription(36, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* getCaptchaData
	*
	* @param { ArgumentTypes.Hash } datasetId,
	* @returns { Result<Result<ReturnTypes.CaptchaData, ReturnTypes.Error>, ReturnTypes.LangError> }
	*/
	"getCaptchaData" (
		datasetId: ArgumentTypes.Hash,
		__options ? : GasLimit,
	): Promise< QueryReturnType< Result<Result<ReturnTypes.CaptchaData, ReturnTypes.Error>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "getCaptchaData", [datasetId], __options , (result) => { return handleReturnType(result, getTypeDescription(39, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* getDappUser
	*
	* @param { ArgumentTypes.AccountId } dappUserId,
	* @returns { Result<Result<ReturnTypes.User, ReturnTypes.Error>, ReturnTypes.LangError> }
	*/
	"getDappUser" (
		dappUserId: ArgumentTypes.AccountId,
		__options ? : GasLimit,
	): Promise< QueryReturnType< Result<Result<ReturnTypes.User, ReturnTypes.Error>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "getDappUser", [dappUserId], __options , (result) => { return handleReturnType(result, getTypeDescription(42, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* getProviderDetails
	*
	* @param { ArgumentTypes.AccountId } accountid,
	* @returns { Result<Result<ReturnTypes.Provider, ReturnTypes.Error>, ReturnTypes.LangError> }
	*/
	"getProviderDetails" (
		accountid: ArgumentTypes.AccountId,
		__options ? : GasLimit,
	): Promise< QueryReturnType< Result<Result<ReturnTypes.Provider, ReturnTypes.Error>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "getProviderDetails", [accountid], __options , (result) => { return handleReturnType(result, getTypeDescription(45, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* getDappDetails
	*
	* @param { ArgumentTypes.AccountId } contract,
	* @returns { Result<Result<ReturnTypes.Dapp, ReturnTypes.Error>, ReturnTypes.LangError> }
	*/
	"getDappDetails" (
		contract: ArgumentTypes.AccountId,
		__options ? : GasLimit,
	): Promise< QueryReturnType< Result<Result<ReturnTypes.Dapp, ReturnTypes.Error>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "getDappDetails", [contract], __options , (result) => { return handleReturnType(result, getTypeDescription(48, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* getCaptchaSolutionCommitment
	*
	* @param { ArgumentTypes.Hash } captchaSolutionCommitmentId,
	* @returns { Result<Result<ReturnTypes.Commit, ReturnTypes.Error>, ReturnTypes.LangError> }
	*/
	"getCaptchaSolutionCommitment" (
		captchaSolutionCommitmentId: ArgumentTypes.Hash,
		__options ? : GasLimit,
	): Promise< QueryReturnType< Result<Result<ReturnTypes.Commit, ReturnTypes.Error>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "getCaptchaSolutionCommitment", [captchaSolutionCommitmentId], __options , (result) => { return handleReturnType(result, getTypeDescription(51, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* getDappBalance
	*
	* @param { ArgumentTypes.AccountId } dapp,
	* @returns { Result<Result<ReturnNumber, ReturnTypes.Error>, ReturnTypes.LangError> }
	*/
	"getDappBalance" (
		dapp: ArgumentTypes.AccountId,
		__options ? : GasLimit,
	): Promise< QueryReturnType< Result<Result<ReturnNumber, ReturnTypes.Error>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "getDappBalance", [dapp], __options , (result) => { return handleReturnType(result, getTypeDescription(53, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* getProviderBalance
	*
	* @param { ArgumentTypes.AccountId } provider,
	* @returns { Result<Result<ReturnNumber, ReturnTypes.Error>, ReturnTypes.LangError> }
	*/
	"getProviderBalance" (
		provider: ArgumentTypes.AccountId,
		__options ? : GasLimit,
	): Promise< QueryReturnType< Result<Result<ReturnNumber, ReturnTypes.Error>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "getProviderBalance", [provider], __options , (result) => { return handleReturnType(result, getTypeDescription(53, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* listProvidersByIds
	*
	* @param { Array<ArgumentTypes.AccountId> } providerIds,
	* @returns { Result<Result<Array<ReturnTypes.Provider>, ReturnTypes.Error>, ReturnTypes.LangError> }
	*/
	"listProvidersByIds" (
		providerIds: Array<ArgumentTypes.AccountId>,
		__options ? : GasLimit,
	): Promise< QueryReturnType< Result<Result<Array<ReturnTypes.Provider>, ReturnTypes.Error>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "listProvidersByIds", [providerIds], __options , (result) => { return handleReturnType(result, getTypeDescription(55, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* listProvidersByStatus
	*
	* @param { Array<ArgumentTypes.GovernanceStatus> } statuses,
	* @returns { Result<Result<Array<ReturnTypes.Provider>, ReturnTypes.Error>, ReturnTypes.LangError> }
	*/
	"listProvidersByStatus" (
		statuses: Array<ArgumentTypes.GovernanceStatus>,
		__options ? : GasLimit,
	): Promise< QueryReturnType< Result<Result<Array<ReturnTypes.Provider>, ReturnTypes.Error>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "listProvidersByStatus", [statuses], __options , (result) => { return handleReturnType(result, getTypeDescription(55, DATA_TYPE_DESCRIPTIONS)); });
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
		__options ? : GasLimit,
	): Promise< QueryReturnType< Result<Result<ReturnTypes.RandomProvider, ReturnTypes.Error>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "getRandomActiveProvider", [userAccount, dappContractAccount], __options , (result) => { return handleReturnType(result, getTypeDescription(58, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* getAllProviderIds
	*
	* @returns { Result<Result<Array<ReturnTypes.AccountId>, ReturnTypes.Error>, ReturnTypes.LangError> }
	*/
	"getAllProviderIds" (
		__options ? : GasLimit,
	): Promise< QueryReturnType< Result<Result<Array<ReturnTypes.AccountId>, ReturnTypes.Error>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "getAllProviderIds", [], __options , (result) => { return handleReturnType(result, getTypeDescription(61, DATA_TYPE_DESCRIPTIONS)); });
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
		__options ? : GasLimit,
	): Promise< QueryReturnType< Result<ReturnNumber, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "getRandomNumber", [len, userAccount, dappAccount], __options , (result) => { return handleReturnType(result, getTypeDescription(29, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* terminate
	*
	* @returns { Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> }
	*/
	"terminate" (
		__options ? : GasLimit,
	): Promise< QueryReturnType< Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "terminate", [], __options , (result) => { return handleReturnType(result, getTypeDescription(16, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* withdraw
	*
	* @param { (string | number | BN) } amount,
	* @returns { Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> }
	*/
	"withdraw" (
		amount: (string | number | BN),
		__options ? : GasLimit,
	): Promise< QueryReturnType< Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "withdraw", [amount], __options , (result) => { return handleReturnType(result, getTypeDescription(16, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* setCodeHash
	*
	* @param { Array<(number | string | BN)> } codeHash,
	* @returns { Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> }
	*/
	"setCodeHash" (
		codeHash: Array<(number | string | BN)>,
		__options ? : GasLimit,
	): Promise< QueryReturnType< Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "setCodeHash", [codeHash], __options , (result) => { return handleReturnType(result, getTypeDescription(16, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* setAdmin
	*
	* @param { ArgumentTypes.AccountId } newAdmin,
	* @returns { Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> }
	*/
	"setAdmin" (
		newAdmin: ArgumentTypes.AccountId,
		__options ? : GasLimit,
	): Promise< QueryReturnType< Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "setAdmin", [newAdmin], __options , (result) => { return handleReturnType(result, getTypeDescription(16, DATA_TYPE_DESCRIPTIONS)); });
	}

}