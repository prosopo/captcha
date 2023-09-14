/* This file is auto-generated */

import type { ContractPromise } from '@polkadot/api-contract';
import type { ApiPromise } from '@polkadot/api';
import type { GasLimit, GasLimitAndRequiredValue, Result } from '@727-ventures/typechain-types';
import type { QueryReturnType } from '@727-ventures/typechain-types';
import { queryJSON, queryOkJSON, handleReturnType } from '@727-ventures/typechain-types';
import type * as ArgumentTypes from '../types-arguments/proxy.js'
import type * as ReturnTypes from '../types-returns/proxy.js'
import type BN from 'bn.js';
//@ts-ignore
import {ReturnNumber} from '@727-ventures/typechain-types';
import {getTypeDescription} from './../shared/utils.js'
import DATA_TYPE_DESCRIPTIONS from '../data/proxy.json' assert { type: 'json' }


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
	* forward
	*
	* @returns { Result<number, ReturnTypes.LangError> }
	*/
	"forward" (
		__options ? : GasLimitAndRequiredValue,
	): Promise< QueryReturnType< Result<number, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "forward", [], __options , (result) => { return handleReturnType(result, getTypeDescription(6, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* handler
	*
	* @param { ArgumentTypes.ProxyMessages } msg,
	* @returns { Result<Result<ReturnTypes.ProxyReturnTypes, ReturnTypes.Error>, ReturnTypes.LangError> }
	*/
	"handler" (
		msg: ArgumentTypes.ProxyMessages,
		__options ? : GasLimit,
	): Promise< QueryReturnType< Result<Result<ReturnTypes.ProxyReturnTypes, ReturnTypes.Error>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "handler", [msg], __options , (result) => { return handleReturnType(result, getTypeDescription(12, DATA_TYPE_DESCRIPTIONS)); });
	}

}