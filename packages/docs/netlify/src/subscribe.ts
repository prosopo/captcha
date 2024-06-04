// Copyright 2021-2024 Prosopo (UK) Ltd.
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
import { AccountId, EnvironmentTypes, EnvironmentTypesSchema, ProsopoServerConfigSchema } from '@prosopo/types'
import { MongoClient, ServerApiVersion } from 'mongodb'
import { ProsopoServer } from '@prosopo/server'
import { generateMnemonic, getPairAsync } from '@prosopo/contract'
import { getLogLevel } from '@prosopo/common'
import { z } from 'zod'

const ENDPOINT_EXISTING_USER = 'https://emailtriggerserver.app.runonflux.io/existing-user/'
const ENDPOINT_NEW_USER = 'https://emailtriggerserver.app.runonflux.io/new-user/'

const BaseBodySpec = z.object({
    email: z.string().email().default(''),
    name: z.string().default(''),
    url: z.string().url(),
    marketingPreferences: z.boolean().optional().default(false),
    originUrl: z.string().url().optional(),
})

// const SubscribeBodySpec = BaseBodySpec.merge(
//     z.object({
//         [ApiParams.procaptchaResponse]: ProcaptchaOutputSchema,
//     })
// )

const EmailRemindBodySpec = BaseBodySpec.merge(
    z.object({
        account: z.string(),
        createdAt: z.date(),
    })
)

const EmailSignupBodySpec = EmailRemindBodySpec.merge(
    z.object({
        mnemonic: z.string(),
    })
)

interface DappRegistration {
    email: string
    url: string
    account: AccountId
    mnemonic: string
    name: string
    marketingPreferences: boolean
    originUrl: string
}

const config = ProsopoServerConfigSchema.parse({
    logLevel: getLogLevel(),
    defaultEnvironment: <EnvironmentTypes>process.env.DEFAULT_ENVIRONMENT || EnvironmentTypesSchema.enum.development,
    defaultNetwork: process.env.DEFAULT_NETWORK || 'rococo',
    account: {
        password: process.env.SERVER_ACCOUNT_PASSWORD || '',
        address: process.env.SERVER_ACCOUNT_ADDRESS || '',
        secret: process.env.SERVER_ACCOUNT_SECRET || '',
    },
    serverUrl: 'https://prosopo.io',
    web2: false,
    solutionThreshold: 60,
    dappName: 'prosopo-website',
})

function prependProtocolToUrl(url: string): string {
    if (url && url.length > 0 && !url.startsWith('http')) {
        return 'https://' + url
    }
    return url
}

// Response for invalid captcha
// function responseInvalidCaptcha() {
//     return {
//         statusCode: 400,
//         body: JSON.stringify({ message: 'Invalid captcha' }),
//     }
// }

// Response for invalid request body
function responseInvalidRequestBody(err: Error) {
    try {
        const parsedError = JSON.parse(err.toString())
        if (Array.isArray(parsedError)) {
            return {
                statusCode: 400,
                body: JSON.stringify({message: `${parsedError[0].message}`}),
            }
        }
    } catch (e) {
        console.error('Error parsing error:', e)
    }

    if ('message' in err) {
        return {
            statusCode: 400,
            body: JSON.stringify({message: `${err.message}`}),
        }
    }
    return {
        statusCode: 400,
        body: JSON.stringify({ message: `Invalid request body, error: ${err}` }),
    }
}

// Response for database error
function responseDatabaseError(err?: Error) {
    return {
        statusCode: 499,
        body: JSON.stringify(err ? `Database error: ${err.message}` : 'Database error'),
    }
}

// Response for existing dapp user
function responseExistingDapp(name: string, email: string) {
    return {
        statusCode: 200,
        body: JSON.stringify({
            message: `Looks like you've signed up previously, ${name}! Please check ${email} for your site key reminder.`,
        }),
    }
}

// Response for newly signed up dapp user
function responseSignup(name: string, email: string) {
    return {
        statusCode: 200,
        body: JSON.stringify({
            message: `Thanks for subscribing, ${name}! Please check ${email} for your site key.`,
        }),
    }
}

// Register a dapp in the database and reply with a thank you message
async function registerDapp(client, collection, name, email, url, marketingPreferences, originUrl: string) {
    const [mnemonic, account] = await generateMnemonic()
    const dappRegistration = { name, email, url, account, mnemonic, marketingPreferences, originUrl }
    await insertDapp(client, collection, dappRegistration)
    const body = EmailSignupBodySpec.parse({
        email,
        name,
        url,
        account,
        mnemonic,
        createdAt: new Date(),
        marketingPreferences,
        originUrl
    })
    await fetch(ENDPOINT_NEW_USER, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    })
    return responseSignup(name, email)
}

// Tell the server to resend an existing user's implementation instructions and reply with a reminder message
async function remindDapp(email: string, name: string, url: string, account: string, marketingPreferences: boolean) {
    console.log(marketingPreferences, 'marketingPreferences')
    const body = EmailRemindBodySpec.parse({ email, name, url, account, marketingPreferences, createdAt: new Date() })
    await fetch(ENDPOINT_EXISTING_USER, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    })
    return responseExistingDapp(name, email)
}

// The user is verified and either exists or not in the database
async function verifiedUser(client, collection, email, name, url, marketingPreferences, originUrl: string) {
    const dappRegistration = await findDapp(collection, email)

    console.log('dappRegistration', dappRegistration)

    if (!dappRegistration) {
        return await registerDapp(client, collection, name, email, url, marketingPreferences, originUrl)
    } else {
        const { name, email, url, account, marketingPreferences } = dappRegistration
        return await remindDapp(email, name, url, account, marketingPreferences)
    }
}

// Return a Mongo database client based on environment variables
function getDatabase() {
    // TODO change the config type and use the database in env
    let prefix = 'mongodb+srv://'
    if (process.env.MONGO_AT === 'localhost' || process.env.MONGO_AT === '127.0.0.1') {
        prefix = 'mongodb://'
    }
    const uri = `${prefix}${process.env.MONGO_AUTH}@${process.env.MONGO_AT}/?retryWrites=true&w=majority`

    return new MongoClient(uri, {
        serverApi: ServerApiVersion.v1,
    })
}

export const handler = async function (event: {[key: string]: string} ) {
    console.log("In subscribe event handler")
    const client = getDatabase()
    const pair = await getPairAsync(
        config.networks[config.defaultNetwork],
        process.env.SERVER_ACCOUNT_JSON || '//Alice'
    )
    const prosopoServer = new ProsopoServer(config, pair)
    try {
        await connectDb(client)
    } catch (err) {
        return responseDatabaseError(err)
    }

    try {
        const collection = client.db('prosopo').collection('emails')
        await prosopoServer.isReady()
        const body = JSON.parse(event.body)

        console.log('body', body)

        body['url'] = prependProtocolToUrl(body['url'])
        body['marketingPreferences'] = body['marketingPreferences'] === 'true'
        body['originUrl'] = prependProtocolToUrl(body['originUrl'])
        const parsed = BaseBodySpec.parse(body)

        console.log('parsed', parsed)

        // const procaptchaResponse = body[ApiParams.procaptchaResponse]
        const { email, url, name, marketingPreferences, originUrl } = parsed

        // Verify the captcha
        // const isVerified = await prosopoServer.isVerified(procaptchaResponse)
        // if (isVerified) {
        //     return await verifiedUser(client, collection, email, name, url, marketingPreferences)
        // } else {
        //     return responseInvalidCaptcha()
        // }

        return await verifiedUser(client, collection, email, name, url, marketingPreferences, originUrl)
    } catch (err) {
        if (client) {
            await client.close()
        }
        console.error('err', err)
        return responseInvalidRequestBody(err)
    } finally {
        if (client) {
            await client.close()
        }
    }
}

async function connectDb(client) {
    try {
        await new Promise<void>((resolve, reject) =>
            client.connect((err) => {
                if (err) reject(`Mongo error: [${err.message}]`)
                resolve()
            })
        )
    } catch (err) {
        await client.close()
        throw new Error(err)
    }
    return
}

async function findDapp(collection, email: string): Promise<DappRegistration | undefined> {
    return await collection.findOne({ email })
}

async function insertDapp(client, collection, dapp: DappRegistration) {
    try {
        await collection.insertOne({
            email: dapp.email,
            name: dapp.name,
            url: dapp.url,
            account: dapp.account,
            mnemonic: dapp.mnemonic,
            marketingPreferences: dapp.marketingPreferences,
            createdAt: Date.now(),
            originUrl: dapp.originUrl,
        })
    } catch (err) {
        if (err.code !== 11000) {
            await client.close()
            console.error(err)
            return responseDatabaseError(err)
        }
    }
    return
}
