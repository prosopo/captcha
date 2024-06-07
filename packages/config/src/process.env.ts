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
import { KeypairType } from '@polkadot/util-crypto/types'
import { ProsopoEnvError } from '@prosopo/common'

export function getSs58Format(): number {
    return parseInt(process.env.PROSOPO_SS58_FORMAT || '') || 42
}

export function getPairType(): KeypairType {
    return (process.env.PROSOPO_PAIR_TYPE as KeypairType) || ('sr25519' as KeypairType)
}

export function getAddress(who?: string): string | undefined {
    if (!who) {
        who = 'PROVIDER'
    } else {
        who = who.toUpperCase()
    }
    return process.env[`PROSOPO_${who}_ADDRESS`] || process.env[`PROSOPO_${who}_KEY`]
}

export function getPassword(who?: string): string | undefined {
    if (!who) {
        who = 'PROVIDER'
    } else {
        who = who.toUpperCase()
    }
    return process.env[`PROSOPO_${who}_PASSWORD`]
}

export function getSecret(who?: string): string | undefined {
    if (!who) {
        who = 'PROVIDER'
    } else {
        who = who.toUpperCase()
    }
    return (
        process.env[`PROSOPO_${who}_SECRET`] ||
        process.env[`PROSOPO_${who}_MNEMONIC`] ||
        process.env[`PROSOPO_${who}_SEED`] ||
        process.env[`PROSOPO_${who}_URI`] ||
        process.env[`PROSOPO_${who}_JSON`]
    )
}

export const getLogLevel = (): string | undefined => {
    return process.env.PROSOPO_LOG_LEVEL
}

export function getContract(): string | undefined {
    return process.env.PROSOPO_CONTRACT_ADDRESS
}

export function getNetwork(): string | undefined {
    return process.env.PROSOPO_DEFAULT_NETWORK
}

export function getEnvironment(): string | undefined {
    return process.env.PROSOPO_ENVIRONMENT
}

export function getEndpoint(): string | undefined {
    return process.env.PROSOPO_SUBSTRATE_ENDPOINT
}

export function getDB(): string {
    if (!process.env.PROSOPO_DATABASE_HOST) {
        throw new ProsopoEnvError('DATABASE.DATABASE_HOST_UNDEFINED')
    }
    return process.env.PROSOPO_DATABASE_HOST
}

export function getDatabaseName(): string {
    return process.env.PROSOPO_DATABASE_NAME || 'prosopo'
}

export function getEnv() {
    if (process.env.NODE_ENV) {
        return process.env.NODE_ENV.replace(/\W/g, '')
    }
    return 'development'
}

export function getDappName(): string {
    return process.env.PROSOPO_DAPP_NAME || 'prosopo'
}

export const getServerPort = (): number => {
    return process.env.PROSOPO_SERVER_PORT ? parseInt(process.env.PROSOPO_SERVER_PORT) : 9228
}

export const getServerUrl = (): string => {
    if (process.env.PROSOPO_SERVER_URL) {
        if (process.env.PROSOPO_SERVER_URL.match(/:\d+/)) {
            return process.env.PROSOPO_SERVER_URL
        }
        return `${process.env.PROSOPO_SERVER_URL}:${getServerPort()}`
    }
    return `http://localhost:${getServerPort()}`
}

export const getWeb2 = (): boolean => {
    return process.env.PROSOPO_WEB2 === 'true'
}

// File Server

export const getFileServerPort = (): number => {
    return process.env.PROSOPO_FILE_SERVER_PORT ? parseInt(process.env.PROSOPO_FILE_SERVER_PORT) : 9378
}

export const getFileServerPaths = (): string => {
    return process.env.PROSOPO_FILE_SERVER_PATHS || '[]'
}

export const getFileServerResize = (): string | undefined => {
    return process.env.PROSOPO_FILE_SERVER_RESIZE
}

export const getFileServerRemotePaths = (): string => {
    return process.env.PROSOPO_FILE_SERVER_REMOTES || '[]'
}

// Package Version

export function getVersion(): string | undefined {
    return process.env.PROSOPO_VERSION
}

// Development Event Flags

export const getMongoAtlasURI = (): string => {
    return process.env.PROSOPO_MONGO_EVENTS_URI || ''
}

export const getDevOnlyWatchEventsFlag = (): boolean => {
    return process.env._DEV_ONLY_WATCH_EVENTS === 'true' || false
}

// Verify

export const getVerifyEndpoint = (): string => {
    return process.env.PROSOPO_VERIFY_ENDPOINT || 'https://api.prosopo.io/siteverify'
}

export const getVerifyType = (): string => {
    return process.env.PROSOPO_VERIFY_TYPE || 'api'
}

// Provider

export const getApiBaseUrl = (): string => {
    return process.env.PROSOPO_API_BASE_URL || 'http://localhost'
}

export const getApiPort = (): number => {
    return process.env.PROSOPO_API_PORT ? parseInt(process.env.PROSOPO_API_PORT) : 9229
}
