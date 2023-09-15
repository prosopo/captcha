/* This file is auto-generated */

import type { ContractPromise } from '@polkadot/api-contract';
import type { ApiPromise } from '@polkadot/api';
import type { KeyringPair } from '@polkadot/keyring/types';
import type { GasLimit, GasLimitAndRequiredValue, Result } from '@727-ventures/typechain-types';
import type { QueryReturnType } from '@727-ventures/typechain-types';
import { queryOkJSON, queryJSON, handleReturnType } from '@727-ventures/typechain-types';
import { txSignAndSend } from '@727-ventures/typechain-types';
import type * as ArgumentTypes from '../types-arguments/common.js';
import type * as ReturnTypes from '../types-returns/common.js';
import type BN from 'bn.js';
//@ts-ignore
import {ReturnNumber} from '@727-ventures/typechain-types';
import {getTypeDescription} from './../shared/utils.js';
// @ts-ignore
import type {EventRecord} from "@polkadot/api/submittable";
import {decodeEvents} from '../shared/utils.js';
import DATA_TYPE_DESCRIPTIONS from '../data/common.json.js';
import EVENT_DATA_TYPE_DESCRIPTIONS from '../event-data/common.json.js';


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
	* getCaller
	*
	* @returns { Result<ReturnTypes.AccountId, ReturnTypes.LangError> }
	*/
	"getCaller" (
		__options: GasLimit,
	): Promise< QueryReturnType< Result<ReturnTypes.AccountId, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "getCaller", [], __options, (result) => { return handleReturnType(result, getTypeDescription(3, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* getCallerBytes
	*
	* @returns { Result<Array<number>, ReturnTypes.LangError> }
	*/
	"getCallerBytes" (
		__options: GasLimit,
	): Promise< QueryReturnType< Result<Array<number>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "getCallerBytes", [], __options, (result) => { return handleReturnType(result, getTypeDescription(7, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* getAccountBytes
	*
	* @param { ArgumentTypes.AccountId } account,
	* @returns { Result<Array<number>, ReturnTypes.LangError> }
	*/
	"getAccountBytes" (
		account: ArgumentTypes.AccountId,
		__options: GasLimit,
	): Promise< QueryReturnType< Result<Array<number>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "getAccountBytes", [account], __options, (result) => { return handleReturnType(result, getTypeDescription(7, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* getGitCommitId
	*
	* @returns { Result<Array<number>, ReturnTypes.LangError> }
	*/
	"getGitCommitId" (
		__options: GasLimit,
	): Promise< QueryReturnType< Result<Array<number>, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "getGitCommitId", [], __options, (result) => { return handleReturnType(result, getTypeDescription(8, DATA_TYPE_DESCRIPTIONS)); });
	}

}