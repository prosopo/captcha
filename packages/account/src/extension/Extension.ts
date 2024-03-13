// Copyright 2021-2023 Prosopo (UK) Ltd.
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
import type { Account, ProcaptchaClientConfigOutput } from '@prosopo/types'

/**
 * Class to interface with accounts.
 */
export abstract class Extension {
    /**
     * Find an account given an address.
     * @returns the account
     * @throws if the account is not found
     * @param config
     */
    public abstract getAccount(config: ProcaptchaClientConfigOutput): Promise<Account>
}
