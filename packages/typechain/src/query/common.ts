/* This file is auto-generated */

import type { ContractPromise } from '@polkadot/api-contract';
import type { ApiPromise } from '@polkadot/api';
import type { GasLimit, GasLimitAndRequiredValue, Result } from '@727-ventures/typechain-types';
import type { QueryReturnType } from '@727-ventures/typechain-types';
import { queryJSON, queryOkJSON, handleReturnType } from '@727-ventures/typechain-types';
import type * as ArgumentTypes from '../types-arguments/common.js';
import type * as ReturnTypes from '../types-returns/common.js';
import type BN from 'bn.js';
//@ts-ignore
import {ReturnNumber} from '@727-ventures/typechain-types';
import {getTypeDescription} from './../shared/utils.js';
import DATA_TYPE_DESCRIPTIONS from '../data/common.json.js';


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
	* getCaller
	*
	* @returns { Result<ReturnTypes.AccountId, ReturnTypes.LangError> }
	*/
	"getCaller" (
		__options ? : GasLimit,
	): Promise< QueryReturnType< Result<ReturnTypes.AccountId, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "getCaller", [], __options , (result) => { return handleReturnType(result, getTypeDescription(3, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* getCallerBytes
	*
	* @returns { Result<Array<number>, ReturnTypes.LangError> }
	*/
	"getCallerBytes" (
		__options ? : GasLimit,
	): Promise< QueryReturnType< Result<Array<number>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "getCallerBytes", [], __options , (result) => { return handleReturnType(result, getTypeDescription(7, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* getAccountBytes
	*
	* @param { ArgumentTypes.AccountId } account,
	* @returns { Result<Array<number>, ReturnTypes.LangError> }
	*/
	"getAccountBytes" (
		account: ArgumentTypes.AccountId,
		__options ? : GasLimit,
	): Promise< QueryReturnType< Result<Array<number>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "getAccountBytes", [account], __options , (result) => { return handleReturnType(result, getTypeDescription(7, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* getGitCommitId
	*
	* @returns { Result<Array<number>, ReturnTypes.LangError> }
	*/
	"getGitCommitId" (
		__options ? : GasLimit,
	): Promise< QueryReturnType< Result<Array<number>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "getGitCommitId", [], __options , (result) => { return handleReturnType(result, getTypeDescription(8, DATA_TYPE_DESCRIPTIONS)); });
	}

}