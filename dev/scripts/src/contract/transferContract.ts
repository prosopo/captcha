import { DappPayee } from '@prosopo/captcha-contract'
import { ProviderEnvironment } from '@prosopo/env'
import { Tasks } from '@prosopo/provider'
import { defaultConfig, loadEnv } from '@prosopo/cli'
import { exit } from 'process'
import { getPairAsync } from '@prosopo/contract'
import mongoose from 'mongoose'
import path from 'path'

interface iDapp {
    email: string
    name: string
    url: string
    account: string
    marketingPreferences: boolean
    createdAt: number
}

const dappSchema: mongoose.Schema<iDapp> = new mongoose.Schema({
    email: String,
    name: String,
    url: String,
    account: String,
    marketingPreferences: Boolean,
    createdAt: Number,
})

const Dapp = mongoose.model('Dapp', dappSchema, 'emails')

const getAllMongoDapps = async (atlasUri: string) => {
    await mongoose
        .connect(atlasUri)
        .then(() => console.log('Connected to MongoDB Atlas'))
        .catch((err) => console.error('Error connecting to MongoDB:', err))

    return await Dapp.find({})
}

// Doesn't work
// const getAllContractDapps = async () => {
// const config = defaultConfig()
// const network = config.networks[config.defaultNetwork]
// const secret = config.account.secret
// const pair = await getPairAsync(network, secret)
// const env = new ProviderEnvironment(config, pair)
// await env.isReady()
// const tasks = new Tasks(env)

// const dapps = await (tasks.contract.contract as any)['dappContracts']()

// return dapps
// }

// Function to register all dapps in contract
const registerDapps = async (addresses: string[]) => {
    const config = defaultConfig()
    const network = config.networks[config.defaultNetwork]
    const secret = config.account.secret
    const pair = await getPairAsync(network, secret)
    const env = new ProviderEnvironment(config, pair)
    await env.isReady()
    const tasks = new Tasks(env)

    addresses.forEach(async (address) => {
        await tasks.contract.query.dappRegister(address, DappPayee.dapp)
    })
}

// Function to get all provider details

// Function to register all providers in contract

const run = async () => {
    const atlasUri = process.env._DEV_ONLY_ATLAS_URI

    if (!atlasUri) {
        throw new Error('Atlas URI not found in env')
    }

    const dapps = await getAllMongoDapps(atlasUri)
    console.log(dapps)

    await registerDapps(dapps.map((dapp: any) => dapp.account))
    exit(0)
}

loadEnv(path.resolve('.'))
run()
