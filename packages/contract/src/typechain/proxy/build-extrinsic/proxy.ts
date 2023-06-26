/* This file is auto-generated */

import type { ContractPromise } from '@polkadot/api-contract';
import type { GasLimit, GasLimitAndRequiredValue } from '@727-ventures/typechain-types';
import { buildSubmittableExtrinsic } from '@727-ventures/typechain-types';
import type * as ArgumentTypes from '../types-arguments/proxy';
import type BN from 'bn.js';
import type { ApiPromise } from '@polkadot/api';



export default class Methods {
	readonly __nativeContract : ContractPromise;
	readonly __apiPromise: ApiPromise;

	constructor(
		nativeContract : ContractPromise,
		apiPromise: ApiPromise,
	) {
		this.__nativeContract = nativeContract;
		this.__apiPromise = apiPromise;
	}
	/**
	 * getAuthor
	 *
	*/
	"getAuthor" (
		__options: GasLimit,
	){
		return buildSubmittableExtrinsic( this.__apiPromise, this.__nativeContract, "getAuthor", [], __options);
	}

	/**
	 * getAdmin
	 *
	*/
	"getAdmin" (
		__options: GasLimit,
	){
		return buildSubmittableExtrinsic( this.__apiPromise, this.__nativeContract, "getAdmin", [], __options);
	}

	/**
	 * getProxyDestination
	 *
	*/
	"getProxyDestination" (
		__options: GasLimit,
	){
		return buildSubmittableExtrinsic( this.__apiPromise, this.__nativeContract, "getProxyDestination", [], __options);
	}

	/**
	 * proxyWithdraw
	 *
	 * @param { (string | number | BN) } amount,
	*/
	"proxyWithdraw" (
		amount: (string | number | BN),
		__options: GasLimit,
	){
		return buildSubmittableExtrinsic( this.__apiPromise, this.__nativeContract, "proxyWithdraw", [amount], __options);
	}

	/**
	 * proxyTerminate
	 *
	*/
	"proxyTerminate" (
		__options: GasLimit,
	){
		return buildSubmittableExtrinsic( this.__apiPromise, this.__nativeContract, "proxyTerminate", [], __options);
	}

	/**
	 * proxySetCodeHash
	 *
	 * @param { Array<(number | string | BN)> } codeHash,
	*/
	"proxySetCodeHash" (
		codeHash: Array<(number | string | BN)>,
		__options: GasLimit,
	){
		return buildSubmittableExtrinsic( this.__apiPromise, this.__nativeContract, "proxySetCodeHash", [codeHash], __options);
	}

	/**
	 * proxyForward
	 *
	*/
	"proxyForward" (
		__options: GasLimitAndRequiredValue,
	){
		return buildSubmittableExtrinsic( this.__apiPromise, this.__nativeContract, "proxyForward", [], __options);
	}

}