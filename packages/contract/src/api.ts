import express, {Router} from 'express';
import {Captcha, CaptchaSolution, CaptchaSolutionResponse, Hash} from './types/api';
import {contractApiInterface} from './contract'
import {BadRequest, ERRORS} from './errors'

/**
 * Returns a router connected to the database which can interact with the Proposo protocol
 *
 * @param contract - An instance of the polkadot-js ContractPromise
 * @param {MongoClient} db - A mongodb client connected to a database with captcha data in the "ProsopoCaptchas" collection
 * @return {Router} - A middleware router that can interact with the Prosopo protocol
 */
export function prosopoMiddleware(env): Router {
    const router = express.Router();
    const contractApi = new contractApiInterface(env);
    /**
     * Register a Provider
     *
     * @return ...
     */
    router.post('/v1/prosopo/provider_register/', async function (req, res, next) {
        try {
            const {serviceOrigin, fee, payee, address} = req.body;
            if (!serviceOrigin || !fee || !payee || !address) {
                throw new BadRequest(ERRORS.API.PARAMETER_UNDEFINED.message);
            }
            const result = await contractApi.providerRegister(serviceOrigin, fee, payee, address);
            res.json(result);
        } catch (err: any) {
            let msg = err.hasOwnProperty("message") ? err.message : ERRORS.TRANSACTION.TX_ERROR.message;
            next(new BadRequest(msg));
        }

    });

    /**
     * Update a Provider
     *
     * @return ...
     */
    router.post('/v1/prosopo/provider_update/', async function (req, res, next) {
        try {
            const {serviceOrigin, fee, payee, address} = req.body;
            if (!serviceOrigin || !fee || !payee || !address) {
                throw new BadRequest(ERRORS.API.PARAMETER_UNDEFINED.message);
            }
            const result = await contractApi.providerUpdate(serviceOrigin, fee, payee, address);
            res.json(result);
        } catch (err: any) {
            let msg = err.hasOwnProperty("message") ? err.message : ERRORS.TRANSACTION.TX_ERROR.message;
            next(new BadRequest(msg));
        }
    });

    /**
     * Deregister a Provider
     *
     * @return ...
     */
    router.post('/v1/prosopo/provider_deregister/', async function (req, res, next) {
        try {
            const address: string = req.body.address;
            if (!address) {
                throw new BadRequest(ERRORS.API.PARAMETER_UNDEFINED.message);
            }
            const result = await contractApi.providerDeregister(address);
            res.json(result);
        } catch (err: any) {
            console.log(err);
            let msg = err.hasOwnProperty("message") ? err.message : ERRORS.TRANSACTION.TX_ERROR.message;
            next(new BadRequest(msg));
        }
    });

    /**
     * Provider stake
     *
     * @return ...
     */
    router.post('/v1/prosopo/provider_stake/', async function (req, res, next) {
        try {
            const {address, value} = req.body;
            if (!address || !value) {
                throw new BadRequest(ERRORS.API.PARAMETER_UNDEFINED.message);
            }
            const result = await contractApi.providerStake(address, value);
            res.json(result);
        } catch (err: any) {
            let msg = err.hasOwnProperty("message") ? err.message : ERRORS.TRANSACTION.TX_ERROR.message;
            next(new BadRequest(msg));
        }
    });

    /**
     * Provider unstake
     *
     * @return ...
     */
    router.post('/v1/prosopo/provider_unstake/', async function (req, res, next) {
        try {
            const {address, value} = req.body;
            if (!address || !value) {
                throw new BadRequest(ERRORS.API.PARAMETER_UNDEFINED.message);
            }
            const result = await contractApi.providerUnstake(address, value);
            res.json(result);
        } catch (err: any) {
            let msg = err.hasOwnProperty("message") ? err.message : ERRORS.TRANSACTION.TX_ERROR.message;
            next(new BadRequest(msg));
        }
    });

    /**
     * Provider add data set
     *
     * @return ...
     */
    router.post('/v1/prosopo/provider_add_data_set/', async function (req, res, next) {
        //TODO
        next()
    });

    /**
     * Dapp register
     *
     * @return ...
     */
    router.post('/v1/prosopo/dapp_register/', async function (req, res, next) {
        //TODO
        next()
    });

    /**
     * Dapp update
     *
     * @return ...
     */
    router.post('/v1/prosopo/dapp_update/', async function (req, res, next) {
        //TODO
        next()
    });

    /**
     * Dapp fund
     *
     * @return ...
     */
    router.post('/v1/prosopo/dapp_fund/', async function (req, res, next) {
        //TODO
        next()
    });

    /**
     * Dapp cancel
     *
     * @return ...
     */
    router.post('/v1/prosopo/dapp_cancel/', async function (req, res, next) {
        //TODO
        next()
    });

    /**
     * Dapp Deregister
     *
     * @return ...
     */
    router.post('/v1/prosopo/dapp_deregister/', async function (req, res, next) {
        //TODO
        next()
    });

    /**
     * Dapp User Commit
     *
     * @return ...
     */
    router.post('/v1/prosopo/dapp_user_commit/', async function (req, res, next) {
        //TODO
        next()
    });

    /**
     * Provider Approve
     *
     * @return ...
     */
    router.post('/v1/prosopo/provider_approve/', async function (req, res, next) {
        //TODO
        next()
    });

    /**
     * Provider Disapprove
     *
     * @return ...
     */
    router.post('/v1/prosopo/provider_disapprove/', async function (req, res, next) {
        //TODO
        next()
    });

    /**
     * Allow Dapp Operator to check if user is human
     *
     * @return ...
     */
    router.get('/v1/prosopo/dapp_operator_is_human_user/', async function (req, res, next) {
        //TODO
        next()
    });

    /**
     * Allow Dapp Operator check recent solution
     *
     * @return ...
     */
    router.get('/v1/prosopo/dapp_operator_check_recent_solution/', async function (req, res, next) {
        //TODO
        next()
    });

    /**
     * Add operator
     *
     * @return ...
     */
    router.post('/v1/prosopo/add_prosopo_operator/', async function (req, res, next) {
        //TODO
        next()
    });

    /**
     * Get captcha solution commitment
     *
     * @return ...
     */
    router.get('/v1/prosopo/captcha_solution_commitment/:solution_root', async function (req, res, next) {
        //TODO
        next()
    });

    /**
     * Get dapp user
     *
     * @return ...
     */
    router.get('/v1/prosopo/dapp/:dapp_account', async function (req, res, next) {
        //TODO
        next()
    });

    /**
     * Returns accounts of the providers
     *
     * @return {Hash} - The Providers
     */
    router.get('/v1/prosopo/providers/', async function (req, res, next) {
        await env.isReady();
        console.log(env.contract.api.consts)
        let result = await env.contract.query.getProviders();
        res.send(result.output);
    });

    /**
     * Returns details of the provider
     *
     * @param {string} provider_account - Provider's account
     * @return {Hash} - The Captcha Provider object
     */
    router.get('/v1/prosopo/provider/:provider_account', async function (req, res, next) {
        await env.isReady();
        const provider_account = req.params.provider_account;
        console.log(provider_account);
        let result = await env.contract.query.getProviderDetails(provider_account);
        res.send(result.output);
    });

    /**
     * Get dapps
     *
     * @return ...
     */
    router.get('/v1/prosopo/dapps/', async function (req, res, next) {
        //TODO
        next()
    });

    /**
     * Get dapp
     *
     * @return ...
     */
    router.get('/v1/prosopo/dapp/:dapp_account', async function (req, res, next) {
        //TODO
        next()
    });

    /**
     * Get operators
     *
     * @return ...
     */
    router.get('/v1/prosopo/operators/', async function (req, res, next) {
        //TODO
        next()
    });

    /**
     * Get dapp balance
     *
     * @return ...
     */
    router.get('/v1/prosopo/dapp/balance/dapp_account', async function (req, res, next) {
        //TODO
        next()
    });

    /**
     * Get provider balance
     *
     * @return ...
     */
    router.get('/v1/prosopo/provider/balance/provider_account', async function (req, res, next) {
        //TODO
        next()
    });

    /**
     * Provides a Captcha puzzle to a Dapp User
     *
     * @param {string} userId - Dapp User id
     * @param {string} dappId - Dapp Contract AccountId
     * @return {Captcha} - The Captcha data
     */
    router.get('/v1/prosopo/provider/captcha', function (req, res, next) {
        // query database for captcha
        // send one solved, one unsolved
        next();
    });

    /**
     * Receives a solved Captcha and verifies the solution of against the database and the on-chain merkle tree hash of the user
     *
     * @param {string} userId - Dapp User id
     * @param {string} dappId - Dapp Contract AccountId
     * @param {CaptchaSolution} captchaSolution - The Captcha solution
     * @return {CaptchaSolutionResponse} - The Captcha solution result and proof
     */
    router.post('/v1/prosopo/provider/captcha', function (req, res, next) {
        // TODO
        next();
    });

    return router;
};