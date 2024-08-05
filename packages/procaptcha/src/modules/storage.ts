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
import { type ProcaptchaLocalStorage, ProsopoLocalStorageSchema } from '@prosopo/types'
import { hexToString } from '@polkadot/util'
import { stringToHex } from '@polkadot/util/string'

const PROCAPTCHA_STORAGE_KEY = '@prosopo/procaptcha'

/**
 * Gets procaptcha storage object from localStorage
 */
function getProcaptchaStorage(): ProcaptchaLocalStorage {
    return ProsopoLocalStorageSchema.parse(
        JSON.parse(hexToString(localStorage.getItem(PROCAPTCHA_STORAGE_KEY) || '0x7b7d'))
    )
}

/**
 * Sets procaptcha storage hex string in localStorage
 * @param storage
 */
function setProcaptchaStorage(storage: ProcaptchaLocalStorage) {
    localStorage.setItem(PROCAPTCHA_STORAGE_KEY, stringToHex(JSON.stringify(ProsopoLocalStorageSchema.parse(storage))))
}

/**
 * Sets default `account`
 */
function setAccount(account: string) {
    setProcaptchaStorage({ ...getProcaptchaStorage(), account })
}

/**
 * Gets default `account`
 */
function getAccount(): string | null {
    return getProcaptchaStorage().account || null
}

export default {
    setAccount,
    getAccount,
    setProcaptchaStorage,
    getProcaptchaStorage,
}
