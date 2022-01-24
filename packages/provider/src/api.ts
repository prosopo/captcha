import express, { Router } from 'express'
import { Tasks } from './tasks/tasks'
import { BadRequest, ERRORS } from './errors'
import { CaptchaSolutionBody, Payee } from './types'

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
            throw new BadRequest(ERRORS.API.PARAMETER_UNDEFINED.message)
        }
        try {
            const result = await tasks.providerRegister(serviceOrigin as string, fee as number, payee as Payee, address as string)
            res.json(result)
        } catch (err: unknown) {
            const msg = `${ERRORS.CONTRACT.TX_ERROR.message}:${err}`
            next(new BadRequest(msg))
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
            throw new BadRequest(ERRORS.API.PARAMETER_UNDEFINED.message)
        }
        try {
            const result = await tasks.providerUpdate(serviceOrigin as string, fee as number, payee as Payee, address as string, value as number)
            res.json(result)
        } catch (err: unknown) {
            const msg = `${ERRORS.CONTRACT.TX_ERROR.message}:${err}`
            next(new BadRequest(msg))
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
            next(new BadRequest(ERRORS.API.PARAMETER_UNDEFINED.message))
        }
        try {
            const result = await tasks.providerDeregister(address as string)
            res.json(result)
        } catch (err: unknown) {
            const msg = `${ERRORS.CONTRACT.TX_ERROR.message}:${err}`
            next(new BadRequest(msg))
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
            next(new BadRequest(ERRORS.API.PARAMETER_UNDEFINED.message))
        }
        try {
            const result = await tasks.providerUnstake(value as number)
            res.json(result)
        } catch (err: unknown) {
            const msg = `${ERRORS.CONTRACT.TX_ERROR.message}:${err}`
            next(new BadRequest(msg))
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
            throw new BadRequest(ERRORS.API.PARAMETER_UNDEFINED.message)
        }
        try {
            const result = await tasks.providerAddDataset(file as string)
            res.json(result)
        } catch (err: unknown) {
            const msg = `${ERRORS.CONTRACT.TX_ERROR.message}:${err}`
            next(new BadRequest(msg))
        }
    })

    /**
     * Dapp register and Dapp update
     *
     * @return JSON result showing DappRegister|DappUpdate event
     */
    router.post('/v1/prosopo/dapp_(register|update)/', async (req, res, next) => {
        const {
            address, dappServiceOrigin, dappContractAddress, dappOwner
        } = req.body
        if (!address || !dappServiceOrigin || !dappContractAddress) {
            throw new BadRequest(ERRORS.API.PARAMETER_UNDEFINED.message)
        }
        try {
            const result = await tasks.dappRegister(dappServiceOrigin as string, dappContractAddress as string, dappOwner as string)
            res.json(result)
        } catch (err: unknown) {
            const msg = `${ERRORS.CONTRACT.TX_ERROR.message}:${err}`
            next(new BadRequest(msg))
        }
    })

    /**
     * Returns accounts of the providers
     *
     * @return {Hash} - The Providers
     */
    router.get('/v1/prosopo/providers/', async (req, res) => {
        await env.isReady()
        const result = await env.contract.query.getProviders()
        res.send(result.output)
    })

    /**
     * Returns details of the provider
     *
     * @param {string} provider_account - Provider's account
     * @return {Hash} - The Captcha Provider object
     */
    router.get('/v1/prosopo/provider/:provider_account', async (req, res) => {
        await env.isReady()
        const { providerAccount } = req.params
        console.log(providerAccount)
        const result = await env.contract.query.getProviderDetails(providerAccount)
        res.send(result.output)
    })

    /**
     * Provides a Captcha puzzle to a Dapp User
     *
     * @param {string} userId - Dapp User id
     * @param {string} dappId - Dapp Contract AccountId
     * @return {Captcha} - The Captcha data
     */
    router.get('/v1/prosopo/provider/captcha/:datasetId', async (req, res, next) => {
        const { datasetId, userAccount } = req.params
        if (!datasetId || !userAccount) {
            throw new BadRequest(ERRORS.API.PARAMETER_UNDEFINED.message)
        }
        try {
            res.json(await tasks.getRandomCaptchasAndRequestHash(datasetId as string, userAccount as string))
        } catch (err: unknown) {
            const msg = `${ERRORS.CONTRACT.TX_ERROR.message}:${err}`
            next(new BadRequest(msg))
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
            throw new BadRequest(err)
        }
        const {
            userAccount, dappAccount, captchas, requestHash
        } = req.body
        try {
            const result = await tasks.dappUserSolution(userAccount as string, dappAccount as string, requestHash as string, captchas as JSON)
            if (result.length === 0) {
                res.json({ status: ERRORS.API.CAPTCHA_FAILED.message, captchas: [] })
            } else {
                res.json({ status: ERRORS.API.CAPTCHA_PASSED.message, captchas: result })
            }
        } catch (err: unknown) {
            console.log(err)
            const msg = ERRORS.API.BAD_REQUEST.message
            next(new BadRequest(msg))
        }
    })

    return router
}
