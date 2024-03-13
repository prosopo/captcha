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

const CURRENT_ACCOUNT_KEY = '@prosopo/current_account'
const PROVIDER_URL_KEY = '@prosopo/provider'

/**
 * Sets default `account`
 */
function setAccount(account: string) {
    localStorage.setItem(CURRENT_ACCOUNT_KEY, account)
}

/**
 * Gets default `account`
 */
function getAccount(): string | null {
    return localStorage.getItem(CURRENT_ACCOUNT_KEY)
}

/**
 * Sets `providerUrl` for `account`
 */
function setProviderUrl(providerUrl: string) {
    localStorage.setItem(PROVIDER_URL_KEY, providerUrl)
}

/**
 * Gets `providerUrl`
 */
function getProviderUrl(): string | null {
    return localStorage.getItem(PROVIDER_URL_KEY)
}

export default {
    setAccount,
    getAccount,
    setProviderUrl,
    getProviderUrl,
}
