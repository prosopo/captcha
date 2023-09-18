/* This file is auto-generated */

import type { ContractPromise } from '@polkadot/api-contract';
import type { ApiPromise } from '@polkadot/api';
import type { KeyringPair } from '@polkadot/keyring/types';
import type { GasLimit, GasLimitAndRequiredValue, Result } from '@727-ventures/typechain-types';
import type { QueryReturnType } from '@727-ventures/typechain-types';
import { queryOkJSON, queryJSON, handleReturnType } from '@727-ventures/typechain-types';
import { txSignAndSend } from '@727-ventures/typechain-types';
import type * as ArgumentTypes from '../types-arguments/proxy.js';
import type * as ReturnTypes from '../types-returns/proxy.js';
import type BN from 'bn.js';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import {ReturnNumber} from '@727-ventures/typechain-types';
import {getTypeDescription} from './../shared/utils.js';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import type {EventRecord[]} from "@polkadot/api/submittable";
import {decodeEvents} from '../shared/utils.js';
import DATA_TYPE_DESCRIPTIONS from '../data/proxy.json' assert { type: 'json' };
import EVENT_DATA_TYPE_DESCRIPTIONS from '../event-data/proxy.json' assert { type: 'json' };


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
	* forward
	*
	* @returns { Result<number, ReturnTypes.LangError> }
	*/
	"forward" (
		__options: GasLimitAndRequiredValue,
	): Promise< QueryReturnType< Result<number, ReturnTypes.LangError> > >{
		return queryOkJSON( this.__apiPromise, this.__nativeContract, this.__callerAddress, "forward", [], __options, (result) => { return handleReturnType(result, getTypeDescription(6, DATA_TYPE_DESCRIPTIONS)); });
	}

	/**
	* handler
	*
	* @param { ArgumentTypes.ProxyMessages } msg,
	* @returns { void }
	*/
	"handler" (
		msg: ArgumentTypes.ProxyMessages,
		__options: GasLimit,
	){
		return txSignAndSend( this.__apiPromise, this.__nativeContract, this.__keyringPair, "handler", (events: EventRecord[]) => {
			return decodeEvents(events, this.__nativeContract, EVENT_DATA_TYPE_DESCRIPTIONS);
		}, [msg], __options);
	}

}