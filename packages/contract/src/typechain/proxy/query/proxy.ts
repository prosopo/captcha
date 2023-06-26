/* This file is auto-generated */

import type { ContractPromise } from '@polkadot/api-contract';
import type { ApiPromise } from '@polkadot/api';
import type { GasLimit, GasLimitAndRequiredValue, Result } from '@727-ventures/typechain-types';
import type { QueryReturnType } from '@727-ventures/typechain-types';
import { queryJSON, queryOkJSON, handleReturnType } from '@727-ventures/typechain-types';
import type * as ArgumentTypes from '../types-arguments/proxy';
import type * as ReturnTypes from '../types-returns/proxy';
import type BN from 'bn.js';
//@ts-ignore
import {ReturnNumber} from '@727-ventures/typechain-types';
import {getTypeDescription} from './../shared/utils';
import DATA_TYPE_DESCRIPTIONS from '../data/proxy.json';


export default class Methods {
	readonly __nativeContract : ContractPromise;
	readonly __apiPromise: ApiPromise;
	readonly __callerAddress : string;

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
	* getAuthor
	*
	* @returns { Result<ReturnTypes.AccountId, ReturnTypes.LangError> }
	*/
	"getAuthor" (
		__options ? : GasLimit,
	): Promise< QueryReturnType< Result<ReturnTypes.AccountId, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "getAuthor", [], __options , (result) => { return handleReturnType(result, getTypeDescription(3, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* getAdmin
	*
	* @returns { Result<ReturnTypes.AccountId, ReturnTypes.LangError> }
	*/
	"getAdmin" (
		__options ? : GasLimit,
	): Promise< QueryReturnType< Result<ReturnTypes.AccountId, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "getAdmin", [], __options , (result) => { return handleReturnType(result, getTypeDescription(3, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* getProxyDestination
	*
	* @returns { Result<ReturnTypes.AccountId, ReturnTypes.LangError> }
	*/
	"getProxyDestination" (
		__options ? : GasLimit,
	): Promise< QueryReturnType< Result<ReturnTypes.AccountId, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "getProxyDestination", [], __options , (result) => { return handleReturnType(result, getTypeDescription(3, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* proxyWithdraw
	*
	* @param { (string | number | BN) } amount,
	* @returns { Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> }
	*/
	"proxyWithdraw" (
		amount: (string | number | BN),
		__options ? : GasLimit,
	): Promise< QueryReturnType< Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "proxyWithdraw", [amount], __options , (result) => { return handleReturnType(result, getTypeDescription(8, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* proxyTerminate
	*
	* @returns { Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> }
	*/
	"proxyTerminate" (
		__options ? : GasLimit,
	): Promise< QueryReturnType< Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "proxyTerminate", [], __options , (result) => { return handleReturnType(result, getTypeDescription(8, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* proxySetCodeHash
	*
	* @param { Array<(number | string | BN)> } codeHash,
	* @returns { Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> }
	*/
	"proxySetCodeHash" (
		codeHash: Array<(number | string | BN)>,
		__options ? : GasLimit,
	): Promise< QueryReturnType< Result<Result<null, ReturnTypes.Error>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "proxySetCodeHash", [codeHash], __options , (result) => { return handleReturnType(result, getTypeDescription(8, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* proxyForward
	*
	* @returns { Result<number, ReturnTypes.LangError> }
	*/
	"proxyForward" (
		__options ? : GasLimitAndRequiredValue,
	): Promise< QueryReturnType< Result<number, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "proxyForward", [], __options , (result) => { return handleReturnType(result, getTypeDescription(11, DATA_TYPE_DESCRIPTIONS)); });
	}

}