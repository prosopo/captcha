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
import {ApiParams, EnvironmentTypes, EnvironmentTypesSchema, ProcaptchaOutputSchema, ProsopoServerConfigSchema} from "@prosopo/types";
import {ProsopoServer} from "@prosopo/server";
import {errorHandler} from "./errorHandler";
import {getLogLevel} from "@prosopo/common";
import {getPairAsync} from "@prosopo/contract";
import { z } from "zod";


// bail if we don't have our ENV set:
if (!process.env.JMAP_USERNAME || !process.env.JMAP_API_TOKEN) {
    console.log("Please set your JMAP_USERNAME and JMAP_TOKEN");
    process.exit(1);
}

const hostname = process.env.JMAP_HOSTNAME || "api.fastmail.com";
const username = process.env.JMAP_USERNAME;

const authUrl = `https://${hostname}/.well-known/jmap`;
const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.JMAP_API_TOKEN}`,
};

const getSession = async () => {
    const response = await fetch(authUrl, {
        method: "GET",
        headers,
    });
    return response.json();
};

const mailboxQuery = async (apiUrl: string, accountId: string) => {
    const response = await fetch(apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
            using: ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
            methodCalls: [
                ["Mailbox/query", {accountId, filter: {name: "Drafts"}}, "a"],
            ],
        }),
    });
    const data = await response.json();

    return await data["methodResponses"][0][1].ids[0];
};

const identityQuery = async (apiUrl: string, accountId: string) => {
    const response = await fetch(apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
            using: [
                "urn:ietf:params:jmap:core",
                "urn:ietf:params:jmap:mail",
                "urn:ietf:params:jmap:submission",
            ],
            methodCalls: [["Identity/get", {accountId, ids: null}, "a"]],
        }),
    });
    const data = await response.json();

    return await data["methodResponses"][0][1].list.filter(
        (identity) => identity.email === username
    )[0].id;
};

const draftResponse = async (apiUrl: string, accountId: string, draftId: string, identityId: string, to: string, subject: string, messageBody: string) => {


    const draftObject = {
        from: [{email: username}],
        to: [{email: to}],
        subject,
        keywords: {$draft: true},
        mailboxIds: {[draftId]: true},
        bodyValues: {body: {value: messageBody, charset: "utf-8"}},
        textBody: [{partId: "body", type: "text/plain"}],
    };

    const response = await fetch(apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
            using: [
                "urn:ietf:params:jmap:core",
                "urn:ietf:params:jmap:mail",
                "urn:ietf:params:jmap:submission",
            ],
            methodCalls: [
                ["Email/set", {accountId, create: {draft: draftObject}}, "a"],
                [
                    "EmailSubmission/set",
                    {
                        accountId,
                        onSuccessDestroyEmail: ["#sendIt"],
                        create: {sendIt: {emailId: "#draft", identityId}},
                    },
                    "b",
                ],
            ],
        }),
    });

    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
};

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


// Response for invalid captcha
function responseInvalidCaptcha() {
    return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid captcha' }),
    }
}

const ContactFormSchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    message: z.string().min(10),
    [ApiParams.procaptchaResponse]: z.string(),
})

const send = async (to: string, subject: string, messageBody: string) => {
    const session = await getSession();
    const apiUrl = session.apiUrl;
    const accountId = session.primaryAccounts["urn:ietf:params:jmap:mail"];
    const draftId = await mailboxQuery(apiUrl, accountId);
    const identityId = await identityQuery(apiUrl, accountId);
    draftResponse(apiUrl, accountId, draftId, identityId, to, subject, messageBody).then(() => {
        console.log("Message sent");
    }).catch((err) => {
        console.error("Error sending message", err);
    })
};

export const handler = async function (event: { [key: string]: string }) {
    try {

        const body = ContactFormSchema.parse(JSON.parse(event.body))

        const procaptchaResponse = ProcaptchaOutputSchema.parse(JSON.parse(body[ApiParams.procaptchaResponse]))

        const pair = await getPairAsync(config.networks[config.defaultNetwork], process.env.SERVER_ACCOUNT_JSON || '//Alice')
        const prosopoServer = new ProsopoServer(config, pair)
        await prosopoServer.isReady()

        // Verify the captcha
        console.log('Verifying captcha', procaptchaResponse)

        const response = await fetch('https://api.prosopo.io/siteverify', {
            method: 'POST',
            body: JSON.stringify(procaptchaResponse),
        })
        const isVerified = (await response.json()).verified

        if (!isVerified) {
            console.error('Invalid captcha', procaptchaResponse)
            return responseInvalidCaptcha()
        }

        const emailMsg = `From: ${body.name} <${body.email}>\n\nPhone: ${body.phone}\n\nMessage: ${body.message}`
        await send('dev@prosopo.io', `Contact From: ${body.name}`, emailMsg)
        return {
            statusCode: 200,
            body: JSON.stringify({message: 'Message sent'}),
        }
    } catch (err) {
        const {code, message} = errorHandler(err)
        return {
            statusCode: code,
            body: JSON.stringify({error: JSON.stringify(message)}),
        }
    }
}
