// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of provider <https://github.com/prosopo-io/provider>.
//
// provider is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// provider is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with provider.  If not, see <http://www.gnu.org/licenses/>.
import express, { Router } from 'express'
import { Tasks } from './tasks/tasks'
import { BadRequest, ERRORS } from './errors'
import { CaptchaSolutionBody, Payee, AccountsResponse } from './types'
import type { AnyJson } from '@polkadot/types/types'
import { validateAddress } from '@polkadot/util-crypto'

/**
 * Returns a router connected to the database which can interact with the Proposo protocol
 *
 * @return {Router} - A middleware router that can interact with the Prosopo protocol
 * @param {Environment} env - The Prosopo environment
 */
export function prosopoMiddleware (env): Router {
    const router = express.Router()
    const tasks = new Tasks(env)
    /**
     * Register a Provider
     *
     * @return JSON result showing ProviderRegister event
     */
    router.post('/v1/prosopo/provider_register/', async (req, res, next) => {
        const {
            serviceOrigin, fee, payee, address
        } = req.body
        if (!serviceOrigin || !fee || !payee || !address) {
            return next(new BadRequest(ERRORS.API.BAD_REQUEST.message))
        }
        try {
            validateAddress(address as string)
            const result = await tasks.providerRegister(serviceOrigin as string, fee as number, payee as Payee, address as string)
            return res.json(result)
        } catch (err: unknown) {
            const msg = `${ERRORS.CONTRACT.TX_ERROR.message}: ${err}`
            return next(new BadRequest(msg))
        }
    })

    /**
     * Update a Provider
     *
     * @return JSON result showing ProviderUpdate event
     */
    router.post('/v1/prosopo/provider_update/', async (req, res, next) => {
        const {
            serviceOrigin, fee, payee, address, value
        } = req.body
        if (!serviceOrigin || !fee || !payee || !address) {
            return next(new BadRequest(ERRORS.API.PARAMETER_UNDEFINED.message))
        }
        try {
            validateAddress(address as string)
            const result = await tasks.providerUpdate(serviceOrigin as string, fee as number, payee as Payee, address as string, value as number)
            return res.json(result)
        } catch (err: unknown) {
            const msg = `${ERRORS.CONTRACT.TX_ERROR.message}: ${err}`
            return next(new BadRequest(msg))
        }
    })

    /**
     * Deregister a Provider
     *
     * @return JSON result showing ProviderDeregister event
     */
    router.post('/v1/prosopo/provider_deregister/', async (req, res, next) => {
        const { address } = req.body
        if (!address) {
            return next(new BadRequest(ERRORS.API.PARAMETER_UNDEFINED.message))
        }
        try {
            validateAddress(address as string)
            const result = await tasks.providerDeregister(address as string)
            return res.json(result)
        } catch (err: unknown) {
            const msg = `${ERRORS.CONTRACT.TX_ERROR.message}: ${err}`
            return next(new BadRequest(msg))
        }
    })

    /**
     * Provider unstake
     *
     * @return JSON result showing ProviderUnstake event
     */
    router.post('/v1/prosopo/provider_unstake/', async (req, res, next) => {
        const { value } = req.body
        if (!value) {
            return next(new BadRequest(ERRORS.API.PARAMETER_UNDEFINED.message))
        }
        try {
            const result = await tasks.providerUnstake(value as number)
            return res.json(result)
        } catch (err: unknown) {
            const msg = `${ERRORS.CONTRACT.TX_ERROR.message}: ${err}`
            return next(new BadRequest(msg))
        }
    })

    /**
     * Provider add data set
     *
     * @return JSON result showing ProviderAddDataset event
     */
    router.post('/v1/prosopo/provider_add_data_set/', async (req, res, next) => {
        const { file } = req.body
        if (!file) {
            return next(new BadRequest(ERRORS.API.PARAMETER_UNDEFINED.message))
        }
        try {
            const result = await tasks.providerAddDataset(file as string)
            return res.json(result)
        } catch (err: unknown) {
            const msg = `${ERRORS.CONTRACT.TX_ERROR.message}: ${err}`
            return next(new BadRequest(msg))
        }
    })

    /**
     * Dapp register and Dapp update
     *
     * @return JSON result showing DappRegister|DappUpdate event
     */
    router.post('/v1/prosopo/dapp_(register|update)/', async (req, res, next) => {
        const { address, dappServiceOrigin, dappContractAddress, dappOwner } = req.body
        if (!address || !dappServiceOrigin || !dappContractAddress) {
            return next(new BadRequest(ERRORS.API.PARAMETER_UNDEFINED.message))
        }
        try {
            validateAddress(address as string)
            validateAddress(dappContractAddress as string)
            const result = await tasks.dappRegister(dappServiceOrigin as string, dappContractAddress as string, dappOwner as string)
            return res.json(result)
        } catch (err: unknown) {
            const msg = `${ERRORS.CONTRACT.TX_ERROR.message}: ${err}`
            return next(new BadRequest(msg))
        }
    })

    /**
     * Returns a random provider using the account that is currently the env signer
     *
     * @return {Provider} - A Provider
     */
    router.get('/v1/prosopo/random_provider/', async (req, res, next) => {
        try {
            await env.isReady()
            const provider = await tasks.getRandomProvider()
            const lastHeader = await env.network.api.rpc.chain.getHeader()
            return res.json({
                blockNumber: lastHeader.number,
                blockHash: lastHeader.hash,
                provider: provider,
                callingAccount: env.signer.address
            })
        } catch (err: unknown) {
            const msg = `${ERRORS.CONTRACT.QUERY_ERROR.message}: ${err}`
            return next(new BadRequest(msg))
        }
    })

    /**
     * Returns the list of provider accounts
     *
     * @return {Hash} - The Providers
     */
    router.get('/v1/prosopo/providers/', async (req, res, next) => {
        try {
            await env.isReady()
            const providers: AnyJson = await tasks.getProviderAccounts()
            return res.json(
            {
                accounts: providers
            } as AccountsResponse
            )
        } catch (err: unknown) {
            const msg = `${ERRORS.CONTRACT.QUERY_ERROR.message}: ${err}`
            return next(new BadRequest(msg))
        }
    })

    /**
     * Returns the list of dapp accounts
     *
     * @return {Hash} - The Dapps
     */
    router.get('/v1/prosopo/dapps/', async (req, res, next) => {
        try {
            await env.isReady()
            const dapps: AnyJson = await tasks.getDappAccounts()
            return res.json(
            {
                accounts: dapps
            } as AccountsResponse
            )
        } catch (err: unknown) {
            const msg = `${ERRORS.CONTRACT.QUERY_ERROR.message}: ${err}`
            return next(new BadRequest(msg))
        }
    })

    /**
     * Returns details of the provider
     *
     * @param {string} provider_account - Provider's account
     * @return {Hash} - The Captcha Provider object
     */
    router.get('/v1/prosopo/provider/:providerAccount', async (req, res, next) => {
        await env.isReady()
        const { providerAccount } = req.params
        if (!providerAccount) {
            return next(new BadRequest(ERRORS.API.BAD_REQUEST.message))
        }
        try {
            validateAddress(providerAccount as string)
            const result = await env.contract.query.getProviderDetails(providerAccount)
            return res.json(result.output)
        } catch (err: unknown) {
            const msg = `${ERRORS.CONTRACT.TX_ERROR.message}: ${err}`
            return next(new BadRequest(msg))
        }
    })

    /**
     * Provides a Captcha puzzle to a Dapp User
     * @param {string} datasetId - Provider datasetId
     * @param {string} userAccount - Dapp User AccountId
     * @return {Captcha} - The Captcha data
     */
    router.get('/v1/prosopo/provider/captcha/:datasetId/:userAccount', async (req, res, next) => {
        const { datasetId, userAccount } = req.params
        if (!datasetId || !userAccount) {
            return next(new BadRequest(ERRORS.API.PARAMETER_UNDEFINED.message))
        }
        try {
            validateAddress(userAccount as string)
            // validateProviderWasRandomlyChosen(userAccount, providerAccount, blockNo)
            return res.json(await tasks.getRandomCaptchasAndRequestHash(datasetId as string, userAccount as string))
        } catch (err: unknown) {
            const msg = `${ERRORS.CONTRACT.TX_ERROR.message}: ${err}`
            return next(new BadRequest(msg))
        }
    })

    /**
     * Receives solved Captchas, store to database, and check against solution commitment
     *
     * @param {string} userAccount - Dapp User id
     * @param {string} dappAccount - Dapp Contract AccountId
     * @param {Captcha[]} captchas - The Captcha solutions
     * @return {CaptchaSolutionResponse} - The Captcha solution result and proof
     */
    router.post('/v1/prosopo/provider/solution', async (req, res, next) => {
        try {
            CaptchaSolutionBody.parse(req.body)
        } catch (err) {
            return next(new BadRequest(err))
        }
        const { userAccount, dappAccount, captchas, requestHash } = req.body
        try {
            const result = await tasks.dappUserSolution(userAccount as string, dappAccount as string, requestHash as string, captchas as JSON)
            return res.json({ status: ERRORS.API.CAPTCHA_PASSED.message, captchas: result })
        } catch (err: unknown) {
            const msg = `${ERRORS.API.BAD_REQUEST.message}: ${err}`
            return next(new BadRequest(msg))
        }
    })

    return router
}
