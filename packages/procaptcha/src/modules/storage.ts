// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of procaptcha <https://github.com/prosopo/procaptcha>.
//
// procaptcha is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// procaptcha is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with procaptcha.  If not, see <http://www.gnu.org/licenses/>.
import { ProsopoRandomProviderResponse } from '../types/index' //unused magic?

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
