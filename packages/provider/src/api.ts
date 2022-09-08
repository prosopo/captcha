// Copyright 2021-2022 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import type { AnyJson } from '@polkadot/types/types';
import { validateAddress } from '@polkadot/util-crypto';
import { parseCaptchaAssets, ProsopoContractApi } from '@prosopo/contract';
import express, { Router } from 'express';
import { Environment } from './env';
import { BadRequest, ERRORS } from './errors';
import { Tasks } from './tasks/tasks';
import {CaptchaWithProof, DappUserSolutionResult} from './types/api';
import { ProsopoEnvironment } from './types/env';
import { AccountsResponse, CaptchaSolutionBody } from './types/api';
import { parseBlockNumber } from './util';



/**
 * Returns a router connected to the database which can interact with the Proposo protocol
 *
 * @return {Router} - A middleware router that can interact with the Prosopo protocol
 * @param {Environment} env - The Prosopo environment
 */
export function prosopoRouter(env: ProsopoEnvironment): Router {
    const router = express.Router();
    const tasks = new Tasks(env);
    const contractApi = new ProsopoContractApi(env.contractAddress, env.mnemonic, env.contractName, env.abi, env.network);

    /**
   * Get the contract address
   * @return {contractAddress: string} - The contract address from environment
   */
    router.get('/v1/prosopo/contract_address', async (req, res, next) => {
        const {contractAddress} = env;
        return res.json({contractAddress});
    });

    /**
   * Returns a random provider using the account that is currently the env signer
   * @param {string} userAccount - Dapp User AccountId
   * @return {Provider} - A Provider
   */
    router.get('/v1/prosopo/random_provider/:userAccount/:dappContractAccount', async (req, res, next) => {
        const {userAccount, dappContractAccount} = req.params;

        try {
            const provider = await tasks.getRandomProvider(userAccount, dappContractAccount);

            return res.json(provider);
        } catch (err: unknown) {
            const msg = `${ERRORS.CONTRACT.QUERY_ERROR.message}: ${err}`;

            return next(new BadRequest(msg));
        }
    });

    /**
   * Returns the list of provider accounts
   *
   * @return {Hash} - The Providers
   */
    router.get('/v1/prosopo/providers/', async (req, res, next) => {
        try {
            await env.isReady();
            const providers: AnyJson = await tasks.getProviderAccounts();

            return res.json(
        {
            accounts: providers
        } as AccountsResponse
            );
        } catch (err: unknown) {
            const msg = `${ERRORS.CONTRACT.QUERY_ERROR.message}: ${err}`;

            return next(new BadRequest(msg));
        }
    });

    /**
   * Returns the list of dapp accounts
   *
   * @return {Hash} - The Dapps
   */
    router.get('/v1/prosopo/dapps/', async (req, res, next) => {
        try {
            await env.isReady();
            const dapps: AnyJson = await tasks.getDappAccounts();

            return res.json(
        {
            accounts: dapps
        } as AccountsResponse
            );
        } catch (err: unknown) {
            const msg = `${ERRORS.CONTRACT.QUERY_ERROR.message}: ${err}`;

            return next(new BadRequest(msg));
        }
    });

    /**
   * Returns details of the provider
   *
   * @param {string} provider_account - Provider's account
   * @return {Hash} - The Captcha Provider object
   */
    router.get('/v1/prosopo/provider/:providerAccount', async (req, res, next) => {
        await env.isReady();
        const {providerAccount} = req.params;

        if (!providerAccount) {
            return next(new BadRequest(ERRORS.API.BAD_REQUEST.message));
        }

        try {
            validateAddress(providerAccount);
            const contract = await contractApi.getContract();
            const result = await contract.query.getProviderDetails(providerAccount);

            return res.json(result.output);
        } catch (err: unknown) {
            const msg = `${ERRORS.CONTRACT.TX_ERROR.message}: ${err}`;

            return next(new BadRequest(msg));
        }
    });

    /**
   * Provides a Captcha puzzle to a Dapp User
   * @param {string} datasetId - Provider datasetId
   * @param {string} userAccount - Dapp User AccountId
   * @param {string} blockNumber - Block number
   * @return {Captcha} - The Captcha data
   */
    router.get('/v1/prosopo/provider/captcha/:datasetId/:userAccount/:dappContractAccount/:blockNumber', async (req, res, next) => {
        const {blockNumber, datasetId, userAccount, dappContractAccount} = req.params;

        if (!datasetId || !userAccount || !blockNumber || !dappContractAccount) {
            return next(new BadRequest(ERRORS.API.PARAMETER_UNDEFINED.message));
        }

        try {
            validateAddress(userAccount, false, env.network.registry.chainSS58);
            const blockNumberParsed = parseBlockNumber(blockNumber);

            await tasks.validateProviderWasRandomlyChosen(userAccount, dappContractAccount, datasetId, blockNumberParsed);

            const taskData = await tasks.getRandomCaptchasAndRequestHash(datasetId, userAccount);
            taskData.captchas = taskData.captchas.map((cwp: CaptchaWithProof) => (
                {
                    ...cwp,
                    captcha: {
                        ...cwp.captcha,
                        items: cwp.captcha.items.map(item => parseCaptchaAssets(item, env.assetsResolver)),
                    }
                }
            )
            );
            return res.json(taskData);
        } catch (err: unknown) {
            const msg = `${ERRORS.CONTRACT.TX_ERROR.message}: ${err}`;

            return next(new BadRequest(msg));
        }
    });

    /**
   * Receives solved CAPTCHA challenges, store to database, and check against solution commitment
   *
   * @param {string} userAccount - Dapp User id
   * @param {string} dappAccount - Dapp Contract AccountId
   * @param {Captcha[]} captchas - The Captcha solutions
   * @return {DappUserSolutionResult} - The Captcha solution result and proof
   */
    router.post('/v1/prosopo/provider/solution', async (req, res, next) => {
        let parsed;
        try {
            parsed = CaptchaSolutionBody.parse(req.body);
        } catch (err) {
            return next(new BadRequest(JSON.stringify(err)));
        }

        try {
            let result: DappUserSolutionResult;
            if (parsed.web2) {
                result = await tasks.dappUserSolutionWeb2(parsed.userAccount, parsed.dappAccount, parsed.requestHash, parsed.captchas);
            } else {
                result = await tasks.dappUserSolution(parsed.userAccount, parsed.dappAccount, parsed.requestHash, parsed.captchas, parsed.blockHash, parsed.txHash);
            }
            return res.json({status: ERRORS.API.CAPTCHA_PENDING.message, ...result });
        } catch (err: unknown) {
            return next(new BadRequest(err));
        }
    });

    return router;
}
