/* This file is auto-generated */

import type { ContractPromise } from '@polkadot/api-contract';
import type { GasLimit, GasLimitAndRequiredValue } from '@727-ventures/typechain-types';
import { buildSubmittableExtrinsic } from '@727-ventures/typechain-types';
import type * as ArgumentTypes from '../types-arguments/captcha';
import type BN from 'bn.js';
import type { ApiPromise } from '@polkadot/api';



export default class Methods {
	private __nativeContract : ContractPromise;
	private __apiPromise: ApiPromise;

	constructor(
		nativeContract : ContractPromise,
		apiPromise: ApiPromise,
	) {
		this.__nativeContract = nativeContract;
		this.__apiPromise = apiPromise;
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
		__options: GasLimit,
	){
		return buildSubmittableExtrinsic( this.__apiPromise, this.__nativeContract, "verifySr25519", [signature, payload], __options);
	}

	/**
	 * getCaller
	 *
	*/
	"getCaller" (
		__options: GasLimit,
	){
		return buildSubmittableExtrinsic( this.__apiPromise, this.__nativeContract, "getCaller", [], __options);
	}

	/**
	 * getPayees
	 *
	*/
	"getPayees" (
		__options: GasLimit,
	){
		return buildSubmittableExtrinsic( this.__apiPromise, this.__nativeContract, "getPayees", [], __options);
	}

	/**
	 * getDappPayees
	 *
	*/
	"getDappPayees" (
		__options: GasLimit,
	){
		return buildSubmittableExtrinsic( this.__apiPromise, this.__nativeContract, "getDappPayees", [], __options);
	}

	/**
	 * getStatuses
	 *
	*/
	"getStatuses" (
		__options: GasLimit,
	){
		return buildSubmittableExtrinsic( this.__apiPromise, this.__nativeContract, "getStatuses", [], __options);
	}

	/**
	 * getProviderStakeThreshold
	 *
	*/
	"getProviderStakeThreshold" (
		__options: GasLimit,
	){
		return buildSubmittableExtrinsic( this.__apiPromise, this.__nativeContract, "getProviderStakeThreshold", [], __options);
	}

	/**
	 * getDappStakeThreshold
	 *
	*/
	"getDappStakeThreshold" (
		__options: GasLimit,
	){
		return buildSubmittableExtrinsic( this.__apiPromise, this.__nativeContract, "getDappStakeThreshold", [], __options);
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
		__options: GasLimitAndRequiredValue,
	){
		return buildSubmittableExtrinsic( this.__apiPromise, this.__nativeContract, "providerRegister", [url, fee, payee], __options);
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
		__options: GasLimitAndRequiredValue,
	){
		return buildSubmittableExtrinsic( this.__apiPromise, this.__nativeContract, "providerUpdate", [url, fee, payee], __options);
	}

	/**
	 * providerDeactivate
	 *
	*/
	"providerDeactivate" (
		__options: GasLimit,
	){
		return buildSubmittableExtrinsic( this.__apiPromise, this.__nativeContract, "providerDeactivate", [], __options);
	}

	/**
	 * providerDeregister
	 *
	*/
	"providerDeregister" (
		__options: GasLimit,
	){
		return buildSubmittableExtrinsic( this.__apiPromise, this.__nativeContract, "providerDeregister", [], __options);
	}

	/**
	 * providerFund
	 *
	*/
	"providerFund" (
		__options: GasLimitAndRequiredValue,
	){
		return buildSubmittableExtrinsic( this.__apiPromise, this.__nativeContract, "providerFund", [], __options);
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
		__options: GasLimit,
	){
		return buildSubmittableExtrinsic( this.__apiPromise, this.__nativeContract, "providerSetDataset", [datasetId, datasetIdContent], __options);
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
		__options: GasLimitAndRequiredValue,
	){
		return buildSubmittableExtrinsic( this.__apiPromise, this.__nativeContract, "dappRegister", [contract, payee], __options);
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
		__options: GasLimitAndRequiredValue,
	){
		return buildSubmittableExtrinsic( this.__apiPromise, this.__nativeContract, "dappUpdate", [contract, payee, owner], __options);
	}

	/**
	 * dappFund
	 *
	 * @param { ArgumentTypes.AccountId } contract,
	*/
	"dappFund" (
		contract: ArgumentTypes.AccountId,
		__options: GasLimitAndRequiredValue,
	){
		return buildSubmittableExtrinsic( this.__apiPromise, this.__nativeContract, "dappFund", [contract], __options);
	}

	/**
	 * dappDeregister
	 *
	 * @param { ArgumentTypes.AccountId } contract,
	*/
	"dappDeregister" (
		contract: ArgumentTypes.AccountId,
		__options: GasLimit,
	){
		return buildSubmittableExtrinsic( this.__apiPromise, this.__nativeContract, "dappDeregister", [contract], __options);
	}

	/**
	 * dappDeactivate
	 *
	 * @param { ArgumentTypes.AccountId } contract,
	*/
	"dappDeactivate" (
		contract: ArgumentTypes.AccountId,
		__options: GasLimit,
	){
		return buildSubmittableExtrinsic( this.__apiPromise, this.__nativeContract, "dappDeactivate", [contract], __options);
	}

	/**
	 * providerCommit
	 *
	 * @param { ArgumentTypes.Commit } commit,
	*/
	"providerCommit" (
		commit: ArgumentTypes.Commit,
		__options: GasLimit,
	){
		return buildSubmittableExtrinsic( this.__apiPromise, this.__nativeContract, "providerCommit", [commit], __options);
	}

	/**
	 * providerCommitMany
	 *
	 * @param { Array<ArgumentTypes.Commit> } commits,
	*/
	"providerCommitMany" (
		commits: Array<ArgumentTypes.Commit>,
		__options: GasLimit,
	){
		return buildSubmittableExtrinsic( this.__apiPromise, this.__nativeContract, "providerCommitMany", [commits], __options);
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
		__options: GasLimit,
	){
		return buildSubmittableExtrinsic( this.__apiPromise, this.__nativeContract, "dappOperatorIsHumanUser", [user, threshold], __options);
	}

	/**
	 * dappOperatorLastCorrectCaptcha
	 *
	 * @param { ArgumentTypes.AccountId } user,
	*/
	"dappOperatorLastCorrectCaptcha" (
		user: ArgumentTypes.AccountId,
		__options: GasLimit,
	){
		return buildSubmittableExtrinsic( this.__apiPromise, this.__nativeContract, "dappOperatorLastCorrectCaptcha", [user], __options);
	}

	/**
	 * getCaptchaData
	 *
	 * @param { ArgumentTypes.Hash } datasetId,
	*/
	"getCaptchaData" (
		datasetId: ArgumentTypes.Hash,
		__options: GasLimit,
	){
		return buildSubmittableExtrinsic( this.__apiPromise, this.__nativeContract, "getCaptchaData", [datasetId], __options);
	}

	/**
	 * getDappUser
	 *
	 * @param { ArgumentTypes.AccountId } dappUserId,
	*/
	"getDappUser" (
		dappUserId: ArgumentTypes.AccountId,
		__options: GasLimit,
	){
		return buildSubmittableExtrinsic( this.__apiPromise, this.__nativeContract, "getDappUser", [dappUserId], __options);
	}

	/**
	 * getProviderDetails
	 *
	 * @param { ArgumentTypes.AccountId } accountid,
	*/
	"getProviderDetails" (
		accountid: ArgumentTypes.AccountId,
		__options: GasLimit,
	){
		return buildSubmittableExtrinsic( this.__apiPromise, this.__nativeContract, "getProviderDetails", [accountid], __options);
	}

	/**
	 * getDappDetails
	 *
	 * @param { ArgumentTypes.AccountId } contract,
	*/
	"getDappDetails" (
		contract: ArgumentTypes.AccountId,
		__options: GasLimit,
	){
		return buildSubmittableExtrinsic( this.__apiPromise, this.__nativeContract, "getDappDetails", [contract], __options);
	}

	/**
	 * getCaptchaSolutionCommitment
	 *
	 * @param { ArgumentTypes.Hash } captchaSolutionCommitmentId,
	*/
	"getCaptchaSolutionCommitment" (
		captchaSolutionCommitmentId: ArgumentTypes.Hash,
		__options: GasLimit,
	){
		return buildSubmittableExtrinsic( this.__apiPromise, this.__nativeContract, "getCaptchaSolutionCommitment", [captchaSolutionCommitmentId], __options);
	}

	/**
	 * getDappBalance
	 *
	 * @param { ArgumentTypes.AccountId } dapp,
	*/
	"getDappBalance" (
		dapp: ArgumentTypes.AccountId,
		__options: GasLimit,
	){
		return buildSubmittableExtrinsic( this.__apiPromise, this.__nativeContract, "getDappBalance", [dapp], __options);
	}

	/**
	 * getProviderBalance
	 *
	 * @param { ArgumentTypes.AccountId } provider,
	*/
	"getProviderBalance" (
		provider: ArgumentTypes.AccountId,
		__options: GasLimit,
	){
		return buildSubmittableExtrinsic( this.__apiPromise, this.__nativeContract, "getProviderBalance", [provider], __options);
	}

	/**
	 * listProvidersByIds
	 *
	 * @param { Array<ArgumentTypes.AccountId> } providerIds,
	*/
	"listProvidersByIds" (
		providerIds: Array<ArgumentTypes.AccountId>,
		__options: GasLimit,
	){
		return buildSubmittableExtrinsic( this.__apiPromise, this.__nativeContract, "listProvidersByIds", [providerIds], __options);
	}

	/**
	 * listProvidersByStatus
	 *
	 * @param { Array<ArgumentTypes.GovernanceStatus> } statuses,
	*/
	"listProvidersByStatus" (
		statuses: Array<ArgumentTypes.GovernanceStatus>,
		__options: GasLimit,
	){
		return buildSubmittableExtrinsic( this.__apiPromise, this.__nativeContract, "listProvidersByStatus", [statuses], __options);
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
		__options: GasLimit,
	){
		return buildSubmittableExtrinsic( this.__apiPromise, this.__nativeContract, "getRandomActiveProvider", [userAccount, dappContractAccount], __options);
	}

	/**
	 * getAllProviderIds
	 *
	*/
	"getAllProviderIds" (
		__options: GasLimit,
	){
		return buildSubmittableExtrinsic( this.__apiPromise, this.__nativeContract, "getAllProviderIds", [], __options);
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
		__options: GasLimit,
	){
		return buildSubmittableExtrinsic( this.__apiPromise, this.__nativeContract, "getRandomNumber", [len, userAccount, dappAccount], __options);
	}

	/**
	 * terminate
	 *
	*/
	"terminate" (
		__options: GasLimit,
	){
		return buildSubmittableExtrinsic( this.__apiPromise, this.__nativeContract, "terminate", [], __options);
	}

	/**
	 * withdraw
	 *
	 * @param { (string | number | BN) } amount,
	*/
	"withdraw" (
		amount: (string | number | BN),
		__options: GasLimit,
	){
		return buildSubmittableExtrinsic( this.__apiPromise, this.__nativeContract, "withdraw", [amount], __options);
	}

	/**
	 * setCodeHash
	 *
	 * @param { Array<(number | string | BN)> } codeHash,
	*/
	"setCodeHash" (
		codeHash: Array<(number | string | BN)>,
		__options: GasLimit,
	){
		return buildSubmittableExtrinsic( this.__apiPromise, this.__nativeContract, "setCodeHash", [codeHash], __options);
	}

	/**
	 * setAdmin
	 *
	 * @param { ArgumentTypes.AccountId } newAdmin,
	*/
	"setAdmin" (
		newAdmin: ArgumentTypes.AccountId,
		__options: GasLimit,
	){
		return buildSubmittableExtrinsic( this.__apiPromise, this.__nativeContract, "setAdmin", [newAdmin], __options);
	}

}